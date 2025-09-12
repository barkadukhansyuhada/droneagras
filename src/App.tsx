import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- TYPE DEFINITIONS ---
type DroneDataType = {
    name: string;
    hargaBaru: number;
    targetOmset: number;
    biayaOperasional: number;
    profitKotor: number;
    produktivitasHaPerBulan: number;
    biaya: { [key: string]: number };
    detailAnalisa: { [key: string]: string | number };
    skemaPembelian: {
        cash: number;
        leasing: {
            dp: number;
            cicilanPerBulan: number;
            tenorBulan: number;
            totalBiaya: number;
        };
    };
    profitBersihLeasing: number;
};

type RiskPoint = { risk: string; mitigation: string };
type RiskCategory = { category: string; icon: string; points: RiskPoint[] };

// --- DATA DARI EXCEL ANDA (TERMASUK DETAIL DARI SHEET ANALISA & CASHFLOW) ---
const T50_DATA: DroneDataType = {
    name: 'DJI Agras T50',
    hargaBaru: 400000000,
    targetOmset: 145200000,
    biayaOperasional: 33000000,
    profitKotor: 112200000,
    produktivitasHaPerBulan: 484,
    biaya: { 'Gaji Tim': 25000000, 'BBM': 6000000, 'Perawatan': 2000000 },
    detailAnalisa: {
        produktivitasPerHari: 22,
        keteranganGaji: '1 Operator & 1 Helper',
        keteranganBBM: 'Estimasi pemakaian per bulan',
        keteranganPerawatan: 'Sparepart & mekanik'
    },
    skemaPembelian: {
        cash: 400000000,
        leasing: {
            dp: 120000000, // 360jt / 3 unit
            cicilanPerBulan: 9644444, // 28.9jt / 3 unit
            tenorBulan: 36,
            get totalBiaya() { return this.dp + (this.cicilanPerBulan * this.tenorBulan) }
        }
    },
    get profitBersihLeasing() {
        return this.profitKotor - this.skemaPembelian.leasing.cicilanPerBulan;
    }
};
const T100_DATA: DroneDataType = {
    name: 'DJI Agras T100',
    hargaBaru: 550000000,
    targetOmset: 264000000,
    biayaOperasional: 39500000,
    profitKotor: 224500000,
    produktivitasHaPerBulan: 880,
    biaya: { 'Gaji Tim': 30000000, 'BBM': 8000000, 'Perawatan': 1500000 },
    detailAnalisa: {
        produktivitasPerHari: 40,
        keteranganGaji: '1 Operator & 3 Helper',
        keteranganBBM: 'Estimasi pemakaian per bulan',
        keteranganPerawatan: 'Sparepart & mekanik'
    },
    skemaPembelian: {
        cash: 550000000,
        leasing: {
            dp: 165000000, // 495jt / 3 unit
            cicilanPerBulan: 13261111, // 39.7jt / 3 unit
            tenorBulan: 36,
            get totalBiaya() { return this.dp + (this.cicilanPerBulan * this.tenorBulan) }
        }
    },
    get profitBersihLeasing() {
        return this.profitKotor - this.skemaPembelian.leasing.cicilanPerBulan;
    }
};
const comparisonData = [
  { name: T50_DATA.name, 'Target Omset': T50_DATA.targetOmset, 'Biaya Operasional': T50_DATA.biayaOperasional, 'Profit Kotor': T50_DATA.profitKotor },
  { name: T100_DATA.name, 'Target Omset': T100_DATA.targetOmset, 'Biaya Operasional': T100_DATA.biayaOperasional, 'Profit Kotor': T100_DATA.profitKotor },
];
const profitComparisonData = [
    { name: T50_DATA.name, 'Profit Kotor': T50_DATA.profitKotor, 'Profit Bersih (Leasing)': T50_DATA.profitBersihLeasing },
    { name: T100_DATA.name, 'Profit Kotor': T100_DATA.profitKotor, 'Profit Bersih (Leasing)': T100_DATA.profitBersihLeasing }
];
const asumsiUmum = { 'Hari Kerja / Bulan': 22, 'Jam Kerja Efektif / Hari': '6 jam', 'Harga Borongan / Ha': 300000 };

// --- STYLING & KOMPONEN KECIL ---
const BAR_COLORS = { 'Target Omset': '#4caf50', 'Biaya Operasional': '#f44336', 'Profit Kotor': '#2196f3', 'Profit Bersih (Leasing)': '#ff9800' };
const formatCurrency = (value: number, compact = false) => {
    if (compact && value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString('id-ID')} Jt`;
    return `Rp ${value.toLocaleString('id-ID')}`;
};
const NavButton = ({ children, onClick, isActive }: { children: React.ReactNode, onClick: () => void, isActive: boolean }) => (
    <button onClick={onClick} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-300 ${isActive ? 'bg-blue-900 text-white shadow-md' : 'bg-white text-blue-900 hover:bg-blue-100'}`}>
        {children}
    </button>
);

// --- HALAMAN 1: RINGKASAN EKSEKUTIF ---
const SummaryPage = () => { 
    const MetricCard = ({ title, value, description, icon }: { title: string, value: string, description: string, icon: string }) => (
        <div className="bg-white p-6 rounded-xl shadow-lg flex flex-col items-center text-center transform hover:scale-105 transition-transform duration-300">
            <div className="text-4xl md:text-5xl mb-3">{icon}</div>
            <h3 className="text-lg md:text-xl font-bold text-gray-700">{title}</h3>
            <p className="text-3xl md:text-4xl font-extrabold text-blue-900 my-2">{value}</p>
            <p className="text-sm md:text-base text-gray-500">{description}</p>
        </div>
    );

    return (
        <>
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">Ringkasan Eksekutif</h1>
                <p className="mt-4 text-md md:text-lg text-gray-600 max-w-3xl mx-auto">Fokus pada DJI Agras T100 untuk profitabilitas dan pengembalian investasi yang superior.</p>
            </header>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
                <MetricCard title="Payback Period T100" value="< 3 Bulan" description="Potensi pengembalian modal investasi yang sangat cepat." icon="⏱️" />
                <MetricCard title="Profitabilitas T100" value={formatCurrency(T100_DATA.profitKotor, true)} description="Estimasi profit kotor per unit setiap bulan." icon="💰" />
                <MetricCard title="Produktivitas T100" value={`${T100_DATA.produktivitasHaPerBulan} Ha`} description="Target cakupan area per unit setiap bulan." icon="🌿" />
            </section>
            <section className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-12">
                <h2 className="text-xl md:text-2xl font-bold text-blue-900 text-center mb-6">Perbandingan Kinerja Bulanan (Per Unit)</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={comparisonData} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" tick={{ fill: '#424242', fontSize: 12 }} />
                        <YAxis tickFormatter={(val) => formatCurrency(val, true)} tick={{ fill: '#424242', fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'rgba(230, 230, 230, 0.5)' }} />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar dataKey="Target Omset" fill={BAR_COLORS['Target Omset']} />
                        <Bar dataKey="Biaya Operasional" fill={BAR_COLORS['Biaya Operasional']} />
                        <Bar dataKey="Profit Kotor" fill={BAR_COLORS['Profit Kotor']} />
                    </BarChart>
                </ResponsiveContainer>
            </section>
            <section className="bg-white p-4 md:p-6 rounded-xl shadow-lg mb-12">
                <h2 className="text-xl md:text-2xl font-bold text-blue-900 text-center mb-6">Profit Kotor vs. Profit Bersih (Dengan Skema Leasing)</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitComparisonData} margin={{ top: 5, right: 5, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="name" tick={{ fill: '#424242', fontSize: 12 }} />
                        <YAxis tickFormatter={(val) => formatCurrency(val, true)} tick={{ fill: '#424242', fontSize: 12 }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: 'rgba(230, 230, 230, 0.5)' }} />
                        <Legend wrapperStyle={{ fontSize: '14px' }} />
                        <Bar dataKey="Profit Kotor" fill={BAR_COLORS['Profit Kotor']} />
                        <Bar dataKey="Profit Bersih (Leasing)" fill={BAR_COLORS['Profit Bersih (Leasing)']} />
                    </BarChart>
                </ResponsiveContainer>
                 <p className="text-xs md:text-sm text-gray-500 mt-4 text-center italic">
                    Profit Bersih dihitung setelah pemotongan angsuran leasing bulanan. Ini memberikan gambaran arus kas bersih yang lebih akurat.
                </p>
            </section>
        </>
    );
};

// --- HALAMAN 2: ANALISIS RINCI (DIPERBARUI) ---
const DetailPage = () => {
    const DetailCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg w-full">
            <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-4 border-b-2 border-blue-200 pb-2">{title}</h3>
            {children}
        </div>
    );

    const BreakdownItem = ({ droneData }: { droneData: DroneDataType }) => ( 
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-bold text-lg md:text-xl text-gray-800 text-center mb-2">{droneData.name}</h4>
            <div>
                <p className="font-semibold text-gray-600">Perhitungan Produktivitas:</p>
                <p className="text-sm text-gray-500 pl-4">{`${droneData.detailAnalisa.produktivitasPerHari} Ha/hari × ${asumsiUmum['Hari Kerja / Bulan']} hari`}</p>
                <p className="text-md md:text-lg font-bold text-blue-800 pl-4">= {droneData.produktivitasHaPerBulan} Ha/Bulan</p>
            </div>
            <div>
                <p className="font-semibold text-gray-600">Perhitungan Omset:</p>
                <p className="text-sm text-gray-500 pl-4">{`${droneData.produktivitasHaPerBulan} Ha/Bulan × ${formatCurrency(asumsiUmum['Harga Borongan / Ha'])}`}</p>
                <p className="text-md md:text-lg font-bold text-green-700 pl-4">= {formatCurrency(droneData.targetOmset)}</p>
            </div>
            <div>
                <p className="font-semibold text-gray-600">Rincian Biaya Operasional:</p>
                <ul className="list-disc list-inside pl-4 text-sm space-y-1">
                    {Object.entries(droneData.biaya).map(([key, value]) => (
                        <li key={key}>
                            <span className="font-semibold">{key}:</span> {formatCurrency(value)}
                            <span className="text-xs text-gray-500 italic ml-2">({droneData.detailAnalisa[`keterangan${key.split(' ')[0]}`]})</span>
                        </li>
                    ))}
                </ul>
                <p className="text-md md:text-lg font-bold text-red-700 pl-4 mt-1">= Total {formatCurrency(droneData.biayaOperasional)}</p>
            </div>
        </div>
    );

    const AcquisitionCostItem = ({ droneData }: { droneData: DroneDataType }) => { 
        const selisih = droneData.skemaPembelian.leasing.totalBiaya - droneData.skemaPembelian.cash;
        return (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h4 className="font-bold text-lg md:text-xl text-gray-800 text-center mb-2">{droneData.name}</h4>
                <div>
                    <h5 className="font-bold text-md md:text-lg text-gray-700">Pembelian Cash</h5>
                    <p className="text-xl md:text-2xl font-bold text-blue-800">{formatCurrency(droneData.skemaPembelian.cash)}</p>
                </div>
                <div className="border-t pt-4">
                    <h5 className="font-bold text-md md:text-lg text-gray-700">Skema Leasing</h5>
                    <ul className="text-sm md:text-base text-gray-600 space-y-1 mt-2">
                        <li><strong>Uang Muka (DP):</strong> {formatCurrency(droneData.skemaPembelian.leasing.dp)}</li>
                        <li><strong>Cicilan / Bulan:</strong> {formatCurrency(droneData.skemaPembelian.leasing.cicilanPerBulan)}</li>
                        <li><strong>Tenor:</strong> {droneData.skemaPembelian.leasing.tenorBulan} bulan</li>
                    </ul>
                    <div className="mt-3 bg-gray-100 p-3 rounded-md">
                        <p className="font-semibold text-gray-800">Total Biaya Leasing:</p>
                        <p className="text-lg md:text-xl font-bold text-orange-600">{formatCurrency(droneData.skemaPembelian.leasing.totalBiaya)}</p>
                        <p className="text-xs md:text-sm text-red-600">Lebih mahal {formatCurrency(selisih)} dari cash</p>
                    </div>
                </div>
            </div>
        );
    };

    const ProfitSharingComparison = ({ droneData }: { droneData: DroneDataType }) => { 
        const investorShareA = droneData.profitKotor * 0.40;
        const teamShareA = droneData.profitKotor * 0.60;
        const capitalReturnMonths = droneData.hargaBaru / droneData.profitKotor;

        return (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <h4 className="font-bold text-lg md:text-xl text-gray-800 text-center mb-2">{droneData.name}</h4>
                
                <div className="bg-white p-3 rounded-md shadow-sm">
                    <h5 className="font-bold text-md md:text-lg text-gray-700">Model A: Bagi Hasil Langsung</h5>
                    <p className="text-xs md:text-sm text-gray-500 mb-2">Profit kotor dibagi sejak bulan pertama.</p>
                    <div className="flex justify-around items-center pt-2 border-t">
                        <div className="text-center">
                            <p className="font-semibold text-blue-800">Investor (40%)</p>
                            <p className="text-lg md:text-xl font-bold text-blue-800">{formatCurrency(investorShareA)}</p>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-indigo-800">Tim (60%)</p>
                            <p className="text-lg md:text-xl font-bold text-indigo-800">{formatCurrency(teamShareA)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-3 rounded-md shadow-sm">
                    <h5 className="font-bold text-md md:text-lg text-gray-700">Model B: Pengembalian Modal Dahulu (Investor Priority)</h5>
                    <p className="text-xs md:text-sm text-gray-500 mb-2">100% profit untuk investor hingga modal kembali, lalu bagi hasil.</p>
                    <div className="pt-2 border-t">
                        <p className="font-semibold text-center">Fase 1: Pengembalian Modal</p>
                        <p className="text-center text-sm text-gray-600">Selama <strong className="text-xl md:text-2xl text-green-700">{capitalReturnMonths.toFixed(1)}</strong> bulan pertama, 100% profit kotor (<strong className="text-green-700">{formatCurrency(droneData.profitKotor)}/bulan</strong>) diserahkan ke investor.</p>
                    </div>
                     <div className="mt-2 pt-2 border-t">
                        <p className="font-semibold text-center">Fase 2: Bagi Hasil Normal</p>
                        <p className="text-center text-sm text-gray-600">Setelah bulan ke-{Math.ceil(capitalReturnMonths)}, bagi hasil dimulai seperti Model A.</p>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderAsumsiValue = (key: string, value: string | number) => {
        if (key.includes('Harga')) {
            return formatCurrency(value as number);
        }
        if (key.includes('Hari Kerja')) {
            return `${value} hari`;
        }
        return value;
    };


    return (
        <>
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">Analisis Rinci</h1>
                <p className="mt-4 text-md md:text-lg text-gray-600 max-w-3xl mx-auto">Membedah angka di balik proyeksi untuk pengambilan keputusan yang informatif.</p>
            </header>

            <div className="space-y-8">
                <DetailCard title="Rincian Perhitungan per Unit (Berdasarkan Sheet Analisa)">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <BreakdownItem droneData={T50_DATA} />
                        <BreakdownItem droneData={T100_DATA} />
                    </div>
                </DetailCard>

                <DetailCard title="Analisis Biaya Akuisisi per Unit (Cash vs. Leasing)">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <AcquisitionCostItem droneData={T50_DATA} />
                        <AcquisitionCostItem droneData={T100_DATA} />
                    </div>
                </DetailCard>
                
                <DetailCard title="Perbandingan Model Pembagian Keuntungan per Unit">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ProfitSharingComparison droneData={T50_DATA} />
                        <ProfitSharingComparison droneData={T100_DATA} />
                    </div>
                    <p className="text-xs md:text-sm text-gray-500 mt-4 text-center italic">
                        <b>Model B (Pengembalian Modal Dahulu)</b> adalah skema yang direkomendasikan karena memberikan keamanan investasi yang lebih tinggi bagi investor.
                    </p>
                </DetailCard>

                <DetailCard title="Asumsi Operasional Utama">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        {Object.entries(asumsiUmum).map(([key, value]) => (
                            <div key={key} className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-500 font-semibold">{key}</p>
                                <p className="text-xl md:text-2xl font-bold text-blue-900">{renderAsumsiValue(key, value)}</p>
                            </div>
                        ))}
                    </div>
                </DetailCard>
            </div>
        </>
    );
};


// --- HALAMAN 3: MANAJEMEN RISIKO ---
const RiskPage = () => { 
    const riskData: RiskCategory[] = [
        { category: 'Risiko Operasional', icon: '⚙️', points: [ { risk: 'Kerusakan alat / drone', mitigation: 'Jadwal perawatan preventif rutin, ketersediaan suku cadang kritis di lokasi, dan memiliki unit cadangan.' }, { risk: 'Kecelakaan kerja', mitigation: 'Pelatihan K3 (Kesehatan dan Keselamatan Kerja) berkala untuk semua operator dan helper, serta penggunaan Alat Pelindung Diri (APD) standar.' }, { risk: 'Kondisi cuaca buruk (hujan, angin kencang)', mitigation: 'Sistem pemantauan cuaca real-time dan penjadwalan kerja yang fleksibel untuk memaksimalkan hari kerja yang cerah.' }, { risk: 'Keterampilan operator yang tidak memadai', mitigation: 'Program sertifikasi dan pelatihan berkelanjutan bagi semua operator untuk memastikan standar kualitas dan keamanan tertinggi.' }, ] },
        { category: 'Risiko Pasar & Kompetisi', icon: '📈', points: [ { risk: 'Penurunan permintaan jasa', mitigation: 'Diversifikasi klien ke berbagai jenis komoditas (sawit, padi, tebu) dan membangun kontrak jangka panjang.' }, { risk: 'Perang harga dengan kompetitor', mitigation: 'Fokus pada keunggulan kualitas layanan, ketepatan waktu, pelaporan data yang akurat, dan membangun reputasi merek yang kuat.' }, { risk: 'Kesulitan mendapatkan kontrak baru', mitigation: 'Membangun tim pemasaran yang proaktif, menjalin kemitraan strategis dengan perusahaan perkebunan besar dan koperasi petani.' }, ] },
        { category: 'Risiko Keuangan', icon: '🏦', points: [ { risk: 'Kenaikan biaya operasional (BBM, suku cadang)', mitigation: 'Melakukan kontrak pembelian BBM dalam volume besar untuk mendapatkan harga lebih baik dan melakukan efisiensi rute kerja.' }, { risk: 'Pembayaran tertunda dari klien', mitigation: 'Menerapkan sistem uang muka (down payment) sebelum pekerjaan dimulai dan memberikan diskon untuk pembayaran tepat waktu.' }, { risk: 'Arus kas (cash flow) negatif di awal', mitigation: 'Menyiapkan modal kerja yang cukup untuk menutupi biaya operasional selama 3-6 bulan pertama.' }, ] }
    ];
    const RiskCard = ({ category, icon, points }: RiskCategory) => (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg w-full">
            <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-4 flex items-center"><span className="text-3xl mr-3">{icon}</span>{category}</h3>
            <div className="space-y-4">{points.map((point, index) => (<div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4"><div><p className="font-semibold text-gray-700">Risiko:</p><p className="text-sm md:text-base text-gray-600">{point.risk}</p></div><div className="bg-blue-50 p-3 rounded-lg"><p className="font-semibold text-blue-800">Strategi Mitigasi:</p><p className="text-sm md:text-base text-blue-700">{point.mitigation}</p></div></div>))}</div>
        </div>
    );
    return (
        <>
            <header className="text-center mb-10"><h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">Manajemen Risiko & Mitigasi</h1><p className="mt-4 text-md md:text-lg text-gray-600 max-w-3xl mx-auto">Mengidentifikasi potensi tantangan dan merencanakan strategi proaktif untuk memastikan keberlanjutan bisnis.</p></header>
            <div className="space-y-8">{riskData.map(data => <RiskCard key={data.category} {...data} />)}</div>
        </>
    );
};


// --- HALAMAN 4: ASISTEN AI ---
const AiAssistantPage = () => { 
    const [investorName, setInvestorName] = useState('');
    const [investorCompany, setInvestorCompany] = useState('');
    const [generatedEmail, setGeneratedEmail] = useState('');
    const [generatedRisks, setGeneratedRisks] = useState<RiskPoint[] | null>(null);
    const [isEmailLoading, setIsEmailLoading] = useState(false);
    const [isRiskLoading, setIsRiskLoading] = useState(false);
    const [error, setError] = useState('');

    const callGeminiApi = async (prompt: string, retries = 3, delay = 1000) => {
        const apiKey = ""; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) {
                if (response.status === 429 && retries > 0) {
                    await new Promise(res => setTimeout(res, delay));
                    return callGeminiApi(prompt, retries - 1, delay * 2);
                }
                throw new Error(`API Error: ${response.statusText}`);
            }
            const result = await response.json();
            if (result.candidates && result.candidates[0].content.parts[0].text) {
                return result.candidates[0].content.parts[0].text;
            } else {
                throw new Error("Respon API tidak valid atau kosong.");
            }
        } catch (e: unknown) {
            console.error(e);
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError(String(e));
            }
            return null;
        }
    };

    const handleGenerateEmail = async () => {
        if (!investorName || !investorCompany) {
            setError("Mohon isi nama dan perusahaan investor.");
            return;
        }
        setIsEmailLoading(true);
        setError('');
        setGeneratedEmail('');
        const prompt = `Buat draf email profesional, singkat, dan persuasif dalam Bahasa Indonesia untuk seorang investor.
- **Penerima:**
  - Nama: ${investorName}
  - Perusahaan: ${investorCompany}
- **Konteks Bisnis:**
  Saya mencari pendanaan untuk bisnis penyewaan drone agrikultur (pertanian) di Indonesia. Fokus utama kami adalah penggunaan drone DJI Agras T100.
- **Poin Kunci yang Harus Disorot:**
  1.  **Profitabilitas Tinggi:** Jelaskan bahwa model bisnis ini menawarkan profit kotor bulanan sekitar ${formatCurrency(T100_DATA.profitKotor)} per unit.
  2.  **Payback Period Cepat:** Sebutkan potensi pengembalian modal (Payback Period) yang sangat cepat, yaitu kurang dari 3 bulan.
  3.  **Rekomendasi Utama:** Tekankan bahwa DJI Agras T100 adalah pilihan yang direkomendasikan karena produktivitas dan profitabilitasnya yang superior dibandingkan T50.
  4.  **Permintaan Tinggi:** Sebutkan bahwa pasar untuk layanan drone pertanian sedang berkembang pesat di Indonesia.
- **Tujuan Email:**
  Mengajak investor untuk bertemu dan mendiskusikan proposal bisnis secara lebih rinci.
- **Gaya Bahasa:**
  Profesional, percaya diri, dan fokus pada data (angka).

**Struktur Email yang Diinginkan:**
1.  **Subjek Email:** Buat subjek yang menarik dan langsung ke intinya. Contoh: "Peluang Investasi: Bisnis Drone Agrikultur dengan ROI Cepat"
2.  **Paragraf 1 (Pembukaan):** Sapa investor secara personal dan perkenalkan diri/perusahaan secara singkat.
3.  **Paragraf 2 (Inti):** Paparkan poin-poin kunci secara ringkas dan jelas. Gunakan angka-angka dari poin kunci di atas.
4.  **Paragraf 3 (Ajakan Bertindak):** Ajak investor untuk meeting (online atau offline) dan tanyakan ketersediaan waktu mereka.
5.  **Penutup:** Ucapkan terima kasih dan sertakan informasi kontak.
`;

        const emailContent = await callGeminiApi(prompt);
        if (emailContent) {
            setGeneratedEmail(emailContent);
        }
        setIsEmailLoading(false);
    };

    const handleGenerateRisks = async () => {
        setIsRiskLoading(true);
        setError('');
        setGeneratedRisks(null);
        const prompt = `
        **Konteks:** Saya sedang membuat analisis risiko untuk bisnis penyewaan drone agrikultur (DJI Agras T100) di Indonesia.
        **Tugas:** Berdasarkan data risiko yang sudah ada (Operasional, Pasar, Keuangan), identifikasi 3 risiko tambahan yang paling mungkin terjadi dan belum tercantum.
        **Data Risiko yang Sudah Ada:**
        - Operasional: Kerusakan alat, kecelakaan kerja, cuaca buruk, keterampilan operator.
        - Pasar: Penurunan permintaan, perang harga, kesulitan kontrak baru.
        - Keuangan: Kenaikan biaya operasional, pembayaran tertunda, arus kas negatif awal.

        **Format Output:**
        Berikan jawaban dalam format JSON. Buatlah array dari objek, di mana setiap objek memiliki dua properti: 'risk' (string) dan 'mitigation' (string).
        Contoh:
        [
          {
            "risk": "Contoh Risiko Baru",
            "mitigation": "Contoh strategi mitigasi untuk risiko baru."
          }
        ]
        `;
        const riskContent = await callGeminiApi(prompt);
        if (riskContent) {
            const cleanedResponse = riskContent.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                const parsedRisks = JSON.parse(cleanedResponse);
                setGeneratedRisks(parsedRisks);
            } catch (e) {
                setError("Gagal mem-parsing respon risiko dari AI.");
                console.error("Parsing error:", e);
            }
        }
        setIsRiskLoading(false);
    };


    return (
        <>
            <header className="text-center mb-10">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight">AI Assistant</h1>
                <p className="mt-4 text-md md:text-lg text-gray-600 max-w-3xl mx-auto">Gunakan AI untuk mempercepat pembuatan draf email dan analisis risiko.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-4">Generator Draf Email untuk Investor</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Nama Investor (Contoh: Bapak Budi)"
                            value={investorName}
                            onChange={(e) => setInvestorName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                            type="text"
                            placeholder="Nama Perusahaan Investor (Contoh: PT. Investasi Maju)"
                            value={investorCompany}
                            onChange={(e) => setInvestorCompany(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleGenerateEmail}
                            disabled={isEmailLoading}
                            className="w-full bg-blue-800 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-900 transition-colors disabled:bg-gray-400"
                        >
                            {isEmailLoading ? 'Membuat Email...' : 'Buat Draf Email'}
                        </button>
                        {generatedEmail && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-md border">
                                <h4 className="font-bold">Draf Email yang Dihasilkan:</h4>
                                <pre className="whitespace-pre-wrap text-sm mt-2">{generatedEmail}</pre>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-xl md:text-2xl font-bold text-blue-900 mb-4">Analisis Risiko Tambahan (AI)</h3>
                    <button
                        onClick={handleGenerateRisks}
                        disabled={isRiskLoading}
                        className="w-full bg-green-700 text-white font-bold py-2 px-4 rounded-md hover:bg-green-800 transition-colors disabled:bg-gray-400"
                    >
                        {isRiskLoading ? 'Menganalisis...' : 'Identifikasi Risiko Tambahan'}
                    </button>
                    {generatedRisks && Array.isArray(generatedRisks) && (
                        <div className="mt-4 space-y-4">
                            {generatedRisks.map((item, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-md border">
                                    <p className="font-semibold text-gray-700">Risiko AI #{index + 1}:</p>
                                    <p className="text-gray-600">{item.risk}</p>
                                    <div className="bg-green-50 p-3 rounded-lg mt-2">
                                        <p className="font-semibold text-green-800">Saran Mitigasi:</p>
                                        <p className="text-green-700">{item.mitigation}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {error && <div className="mt-6 text-center text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
        </>
    );
};

// --- KOMPONEN UTAMA ---
function App() {
    const [activePage, setActivePage] = useState('summary');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleNavClick = (page: string) => {
        setActivePage(page);
        setIsMenuOpen(false);
    };

    const renderPage = () => {
        switch (activePage) {
            case 'summary':
                return <SummaryPage />;
            case 'details':
                return <DetailPage />;
            case 'risks':
                return <RiskPage />;
            case 'ai':
                return <AiAssistantPage />;
            default:
                return <SummaryPage />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
            <nav className="bg-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex items-center">
                            <span className="text-2xl md:text-3xl font-bold text-blue-900">Analisa Bisnis Drone</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-2">
                            <NavButton onClick={() => handleNavClick('summary')} isActive={activePage === 'summary'}>Ringkasan</NavButton>
                            <NavButton onClick={() => handleNavClick('details')} isActive={activePage === 'details'}>Analisis Rinci</NavButton>
                            <NavButton onClick={() => handleNavClick('risks')} isActive={activePage === 'risks'}>Manajemen Risiko</NavButton>
                            <NavButton onClick={() => handleNavClick('ai')} isActive={activePage === 'ai'}>Asisten AI</NavButton>
                        </div>
                         <div className="md:hidden flex items-center">
                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-blue-900 hover:text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    {isMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                {isMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <a onClick={() => handleNavClick('summary')} className={`block px-3 py-2 rounded-md text-base font-medium ${activePage === 'summary' ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Ringkasan</a>
                            <a onClick={() => handleNavClick('details')} className={`block px-3 py-2 rounded-md text-base font-medium ${activePage === 'details' ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Analisis Rinci</a>
                            <a onClick={() => handleNavClick('risks')} className={`block px-3 py-2 rounded-md text-base font-medium ${activePage === 'risks' ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Manajemen Risiko</a>
                            <a onClick={() => handleNavClick('ai')} className={`block px-3 py-2 rounded-md text-base font-medium ${activePage === 'ai' ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-200'}`}>Asisten AI</a>
                        </div>
                    </div>
                )}
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
                {renderPage()}
            </main>

            <footer className="bg-blue-900 text-white mt-12">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-sm">
                    <p>&copy; 2024 Analisis Bisnis Drone. Dibuat untuk membantu pengambilan keputusan investasi.</p>
                </div>
            </footer>
        </div>
    );
}

export default App;