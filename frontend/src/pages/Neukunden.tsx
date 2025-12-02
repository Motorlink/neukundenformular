import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { translations, type Language } from "@/lib/translations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export default function Neukunden() {
  const [requestType, setRequestType] = useState("new");
  const [newsletter, setNewsletter] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState<Language>('de');
  const t = translations[language];
  const heroImages = [
    '/hero/motorlink_hero_1.webp',
    '/hero/motorlink_hero_2.webp',
    '/hero/motorlink_hero_3.webp',
    '/hero/motorlink_hero_4.webp',
    '/hero/motorlink_hero_5.webp',
  ];
  
  // Zufälliges Bild bei jedem Seitenaufruf
  const [randomImage] = useState(() => heroImages[Math.floor(Math.random() * heroImages.length)]);



  // Get CSRF Token
  const { data: csrfData } = trpc.neukunden.getCSRFToken.useQuery();
  
  useEffect(() => {
    if (csrfData?.token) {
      setCsrfToken(csrfData.token);
    }
  }, [csrfData]);
  
  // Get device info
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
    };
    setDeviceInfo(info);
  }, []);

  // Signature canvas functions
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setHasSignature(true);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const submitMutation = trpc.neukunden.submit.useMutation({
    onSuccess: (data) => {
      toast.success(t.successTitle, {
        description: t.successMessage,
      });
      
      // Reset form
      setErrors({});
      setAcceptTerms(false);
      setNewsletter(false);
      clearSignature();
    },
    onError: (error) => {
      toast.error(t.errorTitle, {
        description: error.message || t.errorMessage,
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const newErrors: Record<string, boolean> = {};
    const formData = new FormData(e.currentTarget);
    
    // Check required fields
    const requiredFields = ['companyName', 'firstName', 'lastName', 'street', 'streetNumber', 'zip', 'city', 'email', 'phone'];
    requiredFields.forEach(field => {
      if (!formData.get(field)) {
        newErrors[field] = true;
      }
    });
    
    if (!acceptTerms) {
      newErrors['terms'] = true;
    }
    
    // Get signature from canvas
    const canvas = canvasRef.current;
    const signatureData = canvas?.toDataURL('image/png');
    
    // Validiere {t.signature}
    if (!signatureData || signatureData.length < 50) {
      newErrors['signature'] = true;
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      if (newErrors['signature']) {
        toast.error(t.errorSignature);
      } else {
        toast.error(t.errorRequired);
      }
      return;
    }

    // Map form data to API schema
    const anfrageTyp = requestType === 'new' ? 'neukunde' : requestType === 'forgot' ? 'beratung' : 'katalog';

    submitMutation.mutate({
      csrfToken,
      anfrageTyp,
      firmenname: formData.get('companyName') as string,
      additionalName: formData.get('additionalName') as string || '',
      vorname: formData.get('firstName') as string,
      nachname: formData.get('lastName') as string,
      strasse: formData.get('street') as string,
      hausnummer: formData.get('streetNumber') as string,
      plz: formData.get('zip') as string,
      ort: formData.get('city') as string,
      email: formData.get('email') as string,
      invoiceEmail: formData.get('invoiceEmail') as string || '',
      telefon: formData.get('phone') as string,
      url: formData.get('url') as string || '',
      remarks: formData.get('remarks') as string || '',
      unterschrift: signatureData,
      agbAkzeptiert: acceptTerms,
      newsletter,
      userAgent: deviceInfo.userAgent,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Random Image */}
      <div className="relative h-[40vh] md:h-[50vh] lg:h-[60vh] overflow-hidden">
        {/* Hero Image */}
        <div className="absolute inset-0">
          <img
            src={randomImage}
            alt="MotorLink Workshop"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </div>

        {/* Logo Overlay */}
        <div className="absolute top-6 left-6 z-10">
          <img 
            src="/motorlink-banner-watermark.png" 
            alt="MotorLink" 
            className="h-12 md:h-16 lg:h-20 drop-shadow-2xl" 
          />
        </div>

        {/* Hero Text */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-white px-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 drop-shadow-lg">
              {t.heroTitle}
            </h1>
            <p className="text-lg md:text-xl lg:text-2xl drop-shadow-lg max-w-2xl mx-auto">
              {t.heroSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 md:px-8 py-6 md:py-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              {t.formTitle}
            </h2>
            <p className="text-blue-100 text-sm md:text-base">
              {t.formSubtitle}
            </p>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Request Type Selection */}
            <div className="space-y-4 bg-gray-50 p-4 md:p-6 rounded-xl">
              <RadioGroup value={requestType} onValueChange={setRequestType}>
                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white transition-colors">
                  <RadioGroupItem value="existing" id="existing" className="mt-1" />
                  <Label htmlFor="existing" className="font-normal cursor-pointer text-sm md:text-base leading-relaxed">
                    {t.requestExisting}
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white transition-colors">
                  <RadioGroupItem value="forgot" id="forgot" className="mt-1" />
                  <Label htmlFor="forgot" className="font-normal cursor-pointer text-sm md:text-base leading-relaxed">
                    {t.requestForgot}
                  </Label>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-white transition-colors">
                  <RadioGroupItem value="new" id="new" className="mt-1" />
                  <Label htmlFor="new" className="font-normal cursor-pointer text-sm md:text-base leading-relaxed">
                    {t.requestNew}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label htmlFor="language" className="text-sm font-semibold text-gray-700">{t.language}</Label>
              <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
                <SelectTrigger id="language" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t.sectionCompany}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="companyName" className="text-sm font-semibold text-gray-700">
                  {t.companyName} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Firmenname"
                  className={`h-11 ${errors['companyName'] ? 'border-red-500' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalName" className="text-sm font-semibold text-gray-700">{t.additionalName}</Label>
                <Input
                  id="additionalName"
                  name="additionalName"
                  placeholder="{t.additionalNamePlaceholder}"
                  className="h-11"
                />
              </div>
            </div>

            {/* Contact Person */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t.sectionContact}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-semibold text-gray-700">
                    {t.firstName} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder="{t.firstName}"
                    className={`h-11 ${errors['firstName'] ? 'border-red-500' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-semibold text-gray-700">
                    {t.lastName} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder="{t.lastName}"
                    className={`h-11 ${errors['lastName'] ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t.sectionAddress}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="street" className="text-sm font-semibold text-gray-700">
                  {t.street} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="street"
                  name="street"
                  placeholder="{t.street}"
                  className={`h-11 ${errors['street'] ? 'border-red-500' : ''}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="streetNumber" className="text-sm font-semibold text-gray-700">
                    {t.streetNumber} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="streetNumber"
                    name="streetNumber"
                    placeholder={t.streetNumberShort}
                    className={`h-11 ${errors['streetNumber'] ? 'border-red-500' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip" className="text-sm font-semibold text-gray-700">
                    PLZ <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="zip"
                    name="zip"
                    placeholder={t.zip}
                    className={`h-11 ${errors['zip'] ? 'border-red-500' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-semibold text-gray-700">
                    Ort <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder={t.city}
                    className={`h-11 ${errors['city'] ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t.sectionContactDetails}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  E-Mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t.email}
                  className={`h-11 ${errors['email'] ? 'border-red-500' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoiceEmail" className="text-sm font-semibold text-gray-700">{t.invoiceEmail}</Label>
                <Input
                  id="invoiceEmail"
                  name="invoiceEmail"
                  type="email"
                  placeholder="{t.invoiceEmailPlaceholder}"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">
                  {t.phone} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+41 44 123 45 67"
                  className={`h-11 ${errors['phone'] ? 'border-red-500' : ''}`}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">{t.sectionAdditional}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="url" className="text-sm font-semibold text-gray-700">URL</Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="https://www.example.ch"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks" className="text-sm font-semibold text-gray-700">{t.remarks}</Label>
                <Textarea
                  id="remarks"
                  name="remarks"
                  placeholder="{t.remarksPlaceholder}"
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Signature */}
            <div className="space-y-3 bg-gray-50 p-4 md:p-6 rounded-xl">
              <Label className="text-sm font-semibold text-gray-700">
                {t.signature} <span className="text-red-500">*</span>
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full bg-white cursor-crosshair touch-none"
                  style={{ touchAction: 'none' }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">{t.signatureHere}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="text-sm"
                >
                  {t.clear}
                </Button>
              </div>
              {errors['signature'] && (
                <p className="text-sm text-red-500">{t.errorSignature}</p>
              )}
            </div>

            {/* Newsletter */}
            <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
              <Checkbox
                id="newsletter"
                checked={newsletter}
                onCheckedChange={(checked) => setNewsletter(checked as boolean)}
              />
              <Label htmlFor="newsletter" className="font-normal cursor-pointer text-sm md:text-base">
                {t.newsletter}
              </Label>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4 bg-gray-50 p-4 md:p-6 rounded-xl">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  className="mt-1 flex-shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <Label htmlFor="terms" className="font-normal cursor-pointer text-sm leading-relaxed block">
                    {t.termsAccept} <span className="text-red-500">*</span>
                  </Label>
                  <div className="flex gap-3 text-xs">
                    <a href="#" className="text-blue-600 hover:underline font-semibold">{t.termsReadAGB}</a>
                    <a href="#" className="text-blue-600 hover:underline font-semibold">{t.termsReadPrivacy}</a>
                  </div>
                </div>
              </div>

              <div className="text-xs md:text-sm text-gray-700 space-y-3 leading-relaxed">
                <p dangerouslySetInnerHTML={{ __html: t.termsText1 }} />
                <p dangerouslySetInnerHTML={{ __html: t.termsText2 }} />
                <p dangerouslySetInnerHTML={{ __html: t.termsText3 }} />
              </div>

              {errors['terms'] && (
                <p className="text-sm text-red-500">{t.errorTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? '{t.submitting}' : '{t.submit}'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>{t.footerCopyright}</p>
        </div>
      </main>
    </div>
  );
}
