import React, { useState, useEffect, useRef } from 'react';
import { Calculator, Sun, Moon, Banknote, Globe, Receipt, LayoutTemplate, FileSpreadsheet, FileDown, Printer } from 'lucide-react';
import { Material, AppSettings, PdfSettings } from './types';
import { translations, fmt } from './constants';
import ModelInfo from './components/ModelInfo';
import MaterialsList from './components/MaterialsList';
import OrderSimulation from './components/OrderSimulation';
import SettingsPanel from './components/SettingsPanel';
import PdfSettingsModal from './components/PdfSettingsModal';
import TicketView from './components/TicketView';
import A4DocumentView from './components/A4DocumentView';

const MberatexLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 512 512" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Left Leg (A) */}
    <path d="M110 420 L230 80 H150 L30 420 H110 Z" />
    {/* Right Shape (B) */}
    <path d="M260 80 H380 C430 80 470 110 470 170 C470 210 440 240 400 250 C450 260 480 300 480 350 C480 410 430 440 370 440 H200 L245 320 H360 C390 320 400 310 400 290 C400 270 380 260 350 260 H300 L320 200 H 370 C400 200 410 190 410 170 C410 150 390 140 360 140 H280 L260 80 Z" />
  </svg>
);

const App = () => {
  // --- UI State ---
  const [lang, setLang] = useState('dr'); 
  const [currency, setCurrency] = useState('DH');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'ticket' | 'a4'>('ticket'); 
  const docRefA4 = useRef<HTMLDivElement>(null); 

  // --- PDF Settings State ---
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isLibLoaded, setIsLibLoaded] = useState(false);
  const [pdfSettings, setPdfSettings] = useState<PdfSettings>({
    orientation: 'portrait',
    colorMode: 'color',
    scale: 1
  });

  // --- Editable Fields for Document ---
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLegal, setCompanyLegal] = useState(""); 
  const [docNotes, setDocNotes] = useState("");
  const [companyLogo, setCompanyLogo] = useState<string | null>(null); 
  
  const [docTitle, setDocTitle] = useState("");
  const [docRef, setDocRef] = useState(Math.floor(Math.random() * 10000).toString());
  const [displayDate, setDisplayDate] = useState(new Date().toLocaleDateString('fr-FR'));

  const t = translations[lang];
  const isRTL = lang === 'dr';

  // Initialize title when lang changes
  useEffect(() => {
     if (!docTitle) setDocTitle(t.docTitle);
  }, [lang, t.docTitle, docTitle]);

  // Check html2pdf availability
  useEffect(() => {
    if (window.html2pdf) {
      setIsLibLoaded(true);
    } else {
      const interval = setInterval(() => {
        if (window.html2pdf) {
          setIsLibLoaded(true);
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  // --- State: Global Settings ---
  const [settings, setSettings] = useState<AppSettings>({
    costMinute: 0.80,
    cutRate: 10,
    packRate: 10,
    marginAtelier: 20,
    tva: 20,
    marginBoutique: 30
  });

  const [tempSettings, setTempSettings] = useState<AppSettings>({
    costMinute: 0.80,
    cutRate: 10,
    packRate: 10,
    marginAtelier: 20,
    tva: 20,
    marginBoutique: 30
  });

  // --- State: Product ---
  const [productName, setProductName] = useState("T-shirt Col V");
  const [baseTime, setBaseTime] = useState(6.3); 
  const [productImage, setProductImage] = useState<string | null>(null); 

  // --- ORDER SIMULATION ---
  const [orderQty, setOrderQty] = useState(100); 
  const [wasteRate, setWasteRate] = useState(5); 

  // --- State: Materials ---
  const [materials, setMaterials] = useState<Material[]>([
    { id: 1, name: 'Tissu', unitPrice: 10, qty: 0.80, unit: 'm', threadMeters: 0, threadCapacity: 0 },
    { id: 2, name: 'Fil', unitPrice: 10, qty: 0.0136, unit: 'bobine', threadMeters: 68, threadCapacity: 5000 },
    { id: 3, name: 'Etiquette', unitPrice: 0.20, qty: 1, unit: 'pc', threadMeters: 0, threadCapacity: 0 },
    { id: 4, name: 'Sachet', unitPrice: 0.50, qty: 1, unit: 'pc', threadMeters: 0, threadCapacity: 0 },
  ]);

  // --- Calculations ---
  const totalMaterials = materials.reduce((acc, item) => acc + (item.unitPrice * item.qty), 0);
  const cutTime = baseTime * (settings.cutRate / 100);
  const packTime = baseTime * (settings.packRate / 100);
  const totalTime = baseTime + cutTime + packTime;
  
  // Always calculate labor cost now that toggle is removed
  const laborCost = totalTime * settings.costMinute;
  
  const costPrice = totalMaterials + laborCost; 
  const sellPriceHT = costPrice * (1 + settings.marginAtelier / 100); 
  const sellPriceTTC = sellPriceHT * (1 + settings.tva / 100); 
  const boutiquePrice = sellPriceTTC * (1 + settings.marginBoutique / 100); 

  const purchasingData = materials.map(m => {
    const totalRaw = m.qty * orderQty;
    const totalWithWaste = totalRaw * (1 + wasteRate / 100);
    const qtyToBuy = (m.unit === 'bobine' || m.unit === 'pc') ? Math.ceil(totalWithWaste) : parseFloat(totalWithWaste.toFixed(2));
    const lineCost = qtyToBuy * m.unitPrice;
    return { ...m, totalRaw, totalWithWaste, qtyToBuy, lineCost };
  });

  const totalPurchasingMatCost = purchasingData.reduce((acc, item) => acc + item.lineCost, 0);

  const handleInstantSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Math.max(0, parseFloat(value) || 0) }));
  };

  const handleTempSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (parseFloat(value) < 0) return;
    setTempSettings(prev => ({ ...prev, [name]: value }));
  };

  const applyCostMinute = () => {
    setSettings(prev => ({ ...prev, costMinute: Math.max(0, Number(tempSettings.costMinute) || 0) }));
  };

  const addMaterial = () => {
    const newId = materials.length > 0 ? Math.max(...materials.map(m => m.id)) + 1 : 1;
    setMaterials([...materials, { id: newId, name: 'Nouvelle Matière', unitPrice: 0, qty: 1, unit: 'pc', threadMeters: 0, threadCapacity: 0 }]);
  };

  const updateMaterial = (id: number, field: string, value: string | number) => {
    setMaterials(materials.map(m => {
      if (m.id !== id) return m;
      let updatedItem = { ...m };
      if (field === 'name' || field === 'unit') {
        // @ts-ignore
        updatedItem[field] = value;
        if (field === 'unit' && value === 'bobine' && m.threadCapacity === 0) {
           updatedItem.threadCapacity = 5000;
           updatedItem.threadMeters = 0;
           updatedItem.qty = 0;
        }
      } else {
        const numValue = Math.max(0, Number(value) || 0);
        // @ts-ignore
        updatedItem[field] = numValue;
        if (m.unit === 'bobine') {
            if (field === 'threadMeters' || field === 'threadCapacity') {
                const con = field === 'threadMeters' ? numValue : m.threadMeters;
                const cap = field === 'threadCapacity' ? numValue : m.threadCapacity;
                updatedItem.qty = cap > 0 ? con / cap : 0;
            }
        }
      }
      return updatedItem;
    }));
  };

  const deleteMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- PDF GENERATOR ---
  const generatePDF = async (action: 'save' | 'preview' = 'save') => {
    const element = docRefA4.current;
    if (!element || !window.html2pdf) return;

    setIsGeneratingPdf(true);

    const clone = element.cloneNode(true) as HTMLElement;
    // Set direction explicitly for PDF generation to fix text rendering
    clone.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    
    // Transfer Inputs
    const originalInputs = element.querySelectorAll('input, textarea');
    const cloneInputs = clone.querySelectorAll('input, textarea');
    originalInputs.forEach((original: any, index) => {
      if(cloneInputs[index]) {
        (cloneInputs[index] as HTMLInputElement).value = original.value;
        (cloneInputs[index] as HTMLElement).style.border = 'none';
        (cloneInputs[index] as HTMLElement).style.background = 'transparent';
        (cloneInputs[index] as HTMLElement).style.resize = 'none';
        (cloneInputs[index] as HTMLElement).style.color = 'black';
      }
    });

    const container = document.createElement('div');
    container.style.position = 'fixed'; 
    container.style.top = '-10000px';
    container.style.left = '-10000px';
    container.style.zIndex = '-9999'; 
    
    const isLandscape = pdfSettings.orientation === 'landscape';
    const widthPx = isLandscape ? '1123px' : '794px';
    const heightPx = isLandscape ? '794px' : '1123px';

    container.style.width = widthPx; 
    container.style.minHeight = heightPx;
    container.style.backgroundColor = '#ffffff';
    
    clone.style.width = '100%';
    clone.style.height = 'auto';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.padding = '20px';
    clone.style.margin = '0';
    clone.style.boxSizing = 'border-box';
    clone.style.fontFamily = "'Cairo', sans-serif"; // Ensure font is used in PDF

    if (pdfSettings.colorMode === 'grayscale') {
      clone.style.filter = 'grayscale(100%)';
    }
    
    const allEls = clone.querySelectorAll('*');
    allEls.forEach((el: any) => {
      el.style.color = '#000000';
      // Ensure image quality in PDF by resetting max-width/height logic that might squash it
      if (el.tagName === 'IMG') {
          el.style.maxWidth = '100%';
          el.style.maxHeight = '100%';
          el.style.objectFit = 'contain';
      }

      if (el.classList.contains('bg-slate-800') || el.classList.contains('bg-gray-900')) {
        el.style.backgroundColor = '#f3f4f6';
        el.style.borderColor = '#000';
      }
      if(el.tagName === 'TH') {
         el.style.backgroundColor = '#e5e7eb';
         el.style.color = '#000';
         el.style.border = '1px solid #ccc';
      }
      if(el.tagName === 'TD') {
         el.style.borderBottom = '1px solid #ccc';
      }
      if (el.classList.contains('text-white')) el.classList.remove('text-white');
      if (el.classList.contains('text-gray-100')) el.classList.remove('text-gray-100');
      if(el.tagName === 'BUTTON' || el.tagName === 'LABEL') el.style.display = 'none';
    });

    container.appendChild(clone);
    document.body.appendChild(container);

    const opt = {
      margin:       0,
      filename:     `${productName.replace(/ /g, "_")}_Fiche.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2 * pdfSettings.scale, 
        useCORS: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: isLandscape ? 1123 : 794
      },
      jsPDF:        { unit: 'px', format: isLandscape ? [1123, 794] : [794, 1123], orientation: pdfSettings.orientation }
    };

    try {
        const worker = window.html2pdf().set(opt).from(clone);
        if (action === 'save') {
           await worker.save();
           setShowPdfModal(false);
        }
    } catch (e) {
        console.error("PDF Error:", e);
        alert("Error generating PDF. Please check your inputs.");
    } finally {
        document.body.removeChild(container);
        setIsGeneratingPdf(false);
    }
  };

  const exportToExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    
    csvContent += `${t.docTitle}\n`;
    csvContent += `${t.date}: ${displayDate}\n`;
    csvContent += `${t.modelName}: ${productName}\n\n`;

    csvContent += `${t.matName},${t.price},${t.qtyUnit},${t.total}\n`;
    materials.forEach(m => {
      csvContent += `"${m.name}",${m.unitPrice},${m.qty} ${m.unit},${fmt(m.unitPrice * m.qty)}\n`;
    });
    csvContent += `,,,${t.totalMat}: ${fmt(totalMaterials)} ${currency}\n\n`;

    csvContent += `${t.laborCost},${fmt(laborCost)} ${currency}\n`;
    csvContent += `${t.costPrice},${fmt(costPrice)} ${currency}\n`;
    csvContent += `${t.sellHT},${fmt(sellPriceHT)} ${currency}\n`;
    csvContent += `${t.sellTTC},${fmt(sellPriceTTC)} ${currency}\n`;
    csvContent += `${t.shopPrice},${fmt(boutiquePrice)} ${currency}\n\n`;

    csvContent += `${t.orderNeedsTitle} (${t.orderQty}: ${orderQty})\n`;
    csvContent += `${t.matName},${t.price},${t.qtyToBuy},${t.totalLine}\n`;
    purchasingData.forEach(p => {
      csvContent += `"${p.name}",${p.unitPrice},${fmt(p.qtyToBuy)} ${p.unit},${fmt(p.lineCost)}\n`;
    });
    csvContent += `,,,${t.realBudget}: ${fmt(totalPurchasingMatCost)} ${currency}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${productName.replace(/ /g, "_")}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Theme Classes ---
  const bgMain = darkMode ? 'bg-gray-950' : 'bg-gray-50';
  const bgCard = darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-slate-300';
  const bgCardHeader = darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-300';
  const textPrimary = darkMode ? 'text-gray-100' : 'text-slate-800';
  const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-500';
  // FIXED: inputBg now enforces black text in light mode and white text in dark mode for better visibility
  const inputBg = darkMode ? 'bg-gray-900 border-gray-500 text-white' : 'bg-white border-slate-300 text-slate-900';
  const tableHeader = darkMode ? 'bg-gray-700 text-gray-300' : 'bg-slate-50 text-slate-500';
  const tableRowHover = darkMode ? 'hover:bg-gray-700' : 'hover:bg-slate-50';
  const optionStyle = darkMode ? { backgroundColor: '#1f2937', color: 'white' } : {};

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: "'Cairo', sans-serif" }} className={`min-h-screen ${bgMain} p-4 transition-colors duration-300 ${isRTL ? 'dir-rtl' : 'dir-ltr'}`}>
      
      <PdfSettingsModal 
        t={t} darkMode={darkMode} showPdfModal={showPdfModal} setShowPdfModal={setShowPdfModal}
        isGeneratingPdf={isGeneratingPdf} isLibLoaded={isLibLoaded}
        pdfSettings={pdfSettings} setPdfSettings={setPdfSettings}
        generatePDF={generatePDF}
      >
        <A4DocumentView 
          ref={null} // Ref not needed for live preview rendering
          t={t} currency={currency} darkMode={false} // Force light mode for PDF preview usually
          productName={productName} displayDate={displayDate} setDisplayDate={setDisplayDate}
          docRef={docRef} setDocRef={setDocRef}
          companyName={companyName} setCompanyName={setCompanyName}
          companyAddress={companyAddress} setCompanyAddress={setCompanyAddress}
          companyLegal={companyLegal} setCompanyLegal={setCompanyLegal}
          companyLogo={companyLogo} handleLogoUpload={handleLogoUpload}
          baseTime={baseTime} totalTime={totalTime} settings={settings}
          productImage={productImage} materials={materials}
          laborCost={laborCost} costPrice={costPrice}
          sellPriceHT={sellPriceHT} sellPriceTTC={sellPriceTTC}
          boutiquePrice={boutiquePrice} orderQty={orderQty}
          wasteRate={wasteRate} purchasingData={purchasingData}
          totalPurchasingMatCost={totalPurchasingMatCost}
          docNotes={docNotes} setDocNotes={setDocNotes}
          isRTL={isRTL}
        />
      </PdfSettingsModal>

      <div className={`max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center ${bgCard} p-4 rounded-xl shadow-sm border gap-4 print:hidden`}>
        <div className="flex items-center gap-4 self-start md:self-center">
          {/* HEADER LOGO SECTION */}
          <div className="flex items-center gap-4">
             {/* Logo Container with Blue Background */}
             <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-600/20">
                <MberatexLogo className="w-8 h-8 text-white" />
             </div>
             
             <div className="flex flex-col">
                <h1 className={`text-2xl font-black tracking-tight ${textPrimary}`}>{t.appTitle}</h1>
                <p className={`text-sm font-medium ${textSecondary}`}>{t.subTitle}</p>
             </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
           <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full transition ${darkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
           <div className={`flex items-center px-2 py-1.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-300'}`}><Banknote className={`w-4 h-4 mr-1 ${darkMode ? 'text-gray-300' : 'text-slate-500'}`} /><select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`bg-transparent outline-none text-xs font-bold ${textPrimary} w-16 cursor-pointer`}><option value="DH" style={optionStyle}>DH</option><option value="$" style={optionStyle}>$</option><option value="€" style={optionStyle}>€</option><option value="£" style={optionStyle}>£</option></select></div>
           <div className={`flex items-center px-2 py-1.5 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-300'}`}><Globe className={`w-4 h-4 mr-1 ${darkMode ? 'text-gray-300' : 'text-slate-500'}`} /><select value={lang} onChange={(e) => setLang(e.target.value)} className={`bg-transparent outline-none text-xs font-bold ${textPrimary} cursor-pointer`}><option value="dr" style={optionStyle}>Darija 🇲🇦</option><option value="fr" style={optionStyle}>Français 🇫🇷</option><option value="en" style={optionStyle}>English 🇺🇸</option><option value="es" style={optionStyle}>Español 🇪🇸</option></select></div>
           <div className={`flex items-center gap-1.5 p-1 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-300'}`}>
             <button onClick={() => setViewMode('ticket')} className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${viewMode === 'ticket' ? 'bg-blue-600 text-white shadow-sm' : `${textSecondary} hover:bg-black/5`}`}><Receipt className="w-3 h-3" /> {t.viewTicket}</button>
             <button onClick={() => setViewMode('a4')} className={`px-2 py-1 rounded text-[10px] font-bold transition flex items-center gap-1 ${viewMode === 'a4' ? 'bg-blue-600 text-white shadow-sm' : `${textSecondary} hover:bg-black/5`}`}><LayoutTemplate className="w-3 h-3" /> {t.viewDoc}</button>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-6 print:hidden">
          <ModelInfo 
            t={t} currency={currency} darkMode={darkMode}
            productName={productName} setProductName={setProductName}
            baseTime={baseTime} setBaseTime={setBaseTime}
            totalTime={totalTime} settings={settings} setSettings={setSettings}
            tempSettings={tempSettings} setTempSettings={setTempSettings}
            productImage={productImage} setProductImage={setProductImage}
            applyCostMinute={applyCostMinute}
            handleInstantSettingChange={handleInstantSettingChange}
            handleTempSettingChange={handleTempSettingChange}
            inputBg={inputBg} textPrimary={textPrimary}
            textSecondary={textSecondary} bgCard={bgCard} bgCardHeader={bgCardHeader}
          />
          
          <MaterialsList 
            t={t} currency={currency} darkMode={darkMode}
            materials={materials} addMaterial={addMaterial}
            updateMaterial={updateMaterial} deleteMaterial={deleteMaterial}
            bgCard={bgCard} bgCardHeader={bgCardHeader}
            textPrimary={textPrimary} textSecondary={textSecondary}
            tableHeader={tableHeader} tableRowHover={tableRowHover}
            totalMaterials={totalMaterials}
          />

          <OrderSimulation 
            t={t} currency={currency} darkMode={darkMode}
            orderQty={orderQty} setOrderQty={setOrderQty}
            wasteRate={wasteRate} setWasteRate={setWasteRate}
            purchasingData={purchasingData}
            totalPurchasingMatCost={totalPurchasingMatCost}
            laborCost={laborCost}
            textSecondary={textSecondary} textPrimary={textPrimary} bgCard={bgCard}
          />

          <SettingsPanel 
            t={t} darkMode={darkMode} settings={settings}
            handleChange={handleInstantSettingChange}
            bgCard={bgCard} bgCardHeader={bgCardHeader}
            textPrimary={textPrimary} textSecondary={textSecondary}
            inputBg={inputBg}
          />
        </div>

        <div className="w-full">
          <div className={`rounded-xl shadow-lg border overflow-hidden flex flex-col ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-300'}`}>
            <div className={`p-2 border-b flex gap-2 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-300'} print:hidden`}>
              <button onClick={() => setViewMode('ticket')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'ticket' ? 'bg-blue-600 text-white shadow-sm' : `${textSecondary} hover:bg-black/5`}`}><Receipt className="w-3 h-3" /> {t.viewTicket}</button>
              <button onClick={() => setViewMode('a4')} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'a4' ? 'bg-blue-600 text-white shadow-sm' : `${textSecondary} hover:bg-black/5`}`}><LayoutTemplate className="w-3 h-3" /> {t.viewDoc}</button>
            </div>

            {viewMode === 'ticket' && (
              <TicketView 
                t={t} currency={currency} darkMode={darkMode}
                productName={productName} displayDate={displayDate}
                totalMaterials={totalMaterials} totalTime={totalTime}
                laborCost={laborCost} costPrice={costPrice}
                settings={settings} productImage={productImage}
                textPrimary={textPrimary} textSecondary={textSecondary}
                materials={materials}
                cutTime={cutTime}
                packTime={packTime}
                sellPriceHT={sellPriceHT}
                sellPriceTTC={sellPriceTTC}
                boutiquePrice={boutiquePrice}
              />
            )}

            {viewMode === 'a4' && (
              <>
                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-slate-50 border-slate-300'} print:hidden`}>
                  <h2 className={`font-bold ${textPrimary}`}>{t.ticketTitle}</h2>
                  <div className="flex gap-2">
                    <button onClick={exportToExcel} className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition"><FileSpreadsheet className="w-3 h-3" /> {t.excel}</button>
                    <button onClick={() => setShowPdfModal(true)} className="flex items-center gap-1 text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded transition"><FileDown className="w-3 h-3" /> {t.pdf}</button>
                    <button onClick={() => window.print()} className="flex items-center gap-1 text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded transition"><Printer className="w-3 h-3" /> {t.print}</button>
                  </div>
                </div>

                <A4DocumentView 
                  ref={docRefA4}
                  t={t} currency={currency} darkMode={darkMode}
                  productName={productName} displayDate={displayDate} setDisplayDate={setDisplayDate}
                  docRef={docRef} setDocRef={setDocRef}
                  companyName={companyName} setCompanyName={setCompanyName}
                  companyAddress={companyAddress} setCompanyAddress={setCompanyAddress}
                  companyLegal={companyLegal} setCompanyLegal={setCompanyLegal}
                  companyLogo={companyLogo} handleLogoUpload={handleLogoUpload}
                  baseTime={baseTime} totalTime={totalTime} settings={settings}
                  productImage={productImage} materials={materials}
                  laborCost={laborCost} costPrice={costPrice}
                  sellPriceHT={sellPriceHT} sellPriceTTC={sellPriceTTC}
                  boutiquePrice={boutiquePrice} orderQty={orderQty}
                  wasteRate={wasteRate} purchasingData={purchasingData}
                  totalPurchasingMatCost={totalPurchasingMatCost}
                  docNotes={docNotes} setDocNotes={setDocNotes}
                  isRTL={isRTL}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Developer Footer */}
      <footer className="mt-12 mb-6 text-center">
        <p className={`text-[10px] uppercase font-bold tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
          Developed by <span className={darkMode ? 'text-slate-500' : 'text-slate-600'}>Soulayman Berraadi</span>
        </p>
      </footer>

    </div> // Closing main div
  );
};

export default App;