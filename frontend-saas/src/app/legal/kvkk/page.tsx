export default function KVKKPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-8">6698 Sayılı KVKK Uyarınca Aydınlatma Metni</h1>
      
      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        Pulpax (bundan böyle &quot;Şirket&quot; olarak anılacaktır) olarak, veri sorumlusu sıfatıyla, kişisel verilerinizin güvenliğine önem veriyoruz.
        Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;Kanun&quot;) uyarınca, Pulpax Dental OS kullanıcılarının ve hastalarının kişisel verilerinin
        işlenmesine ilişkin usul ve esasları açıklamak amacıyla hazırlanmıştır.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">1. İşlenen Kişisel Verileriniz</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Kullanım sürecinde; kimlik bilgileriniz (ad, soyad), iletişim bilgileriniz (e-posta, telefon), kurum bilgileriniz ve 
        sağlık kuruluşunuzda işlenen hasta verileri (sağlık verileri, dental kayıtlar vb.) işlenmektedir.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">2. Veri İşleme Amaçları</h3>
      <ul className="list-disc pl-6 text-slate-600 dark:text-slate-400 mb-6 space-y-2">
        <li>Bulut tabanlı klinik yönetim hizmetlerinin sunulması,</li>
        <li>Hasta kayıtlarının ve randevuların dijital ortamda takibi,</li>
        <li>Yasal yükümlülüklerin yerine getirilmesi ve resmi makamlara bildirim,</li>
        <li>Sistem güvenliğinin sağlanması ve teknik destek hizmetleri.</li>
      </ul>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">3. Sağlık Verilerinin İşlenmesi (Özel Nitelikli Kişisel Veriler)</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
        Klinik kullanıcıları tarafından sisteme girilen hasta sağlık verileri, Kanun&apos;un 6. maddesi uyarınca &quot;Özel Nitelikli Kişisel Veri&quot;
        kapsamındadır. Bu veriler, tıbbi teşhis, tedavi ve bakım hizmetlerinin yürütülmesi amacıyla ve ilgili hastaların açık rızası 
        doğrultusunda veya kanunda öngörülen istisnalar kapsamında işlenir. Pulpax, bu verilerin güvenliği için AES-256 şifreleme ve 
        katı erişim kontrol protokolleri uygulamaktadır.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">4. Veri Aktarımı</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Verileriniz, yalnızca yasal zorunluluklar halinde yetkili kamu kurum ve kuruluşları ile veya teknik hizmetlerin sağlanması 
        amacıyla yurtiçindeki güvenli sunucu barındırma (hosting) sağlayıcılarımızla paylaşılmaktadır.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">5. Haklarınız</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Kanun&apos;un 11. maddesi uyarınca, verilerinizin işlenip işlenmediğini öğrenme, yanlış işlenmişse düzeltilmesini isteme,
        silinmesini talep etme ve verilerinizin işlenmesine itiraz etme haklarına sahipsiniz.
      </p>
    </>
  );
}
