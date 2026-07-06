export default function TermsPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-8">Kullanım Şartları ve Hizmet Sözleşmesi</h1>
      
      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        Pulpax Dental OS sistemine hoş geldiniz. Sistemi kullanarak, aşağıda belirtilen şartları kabul etmiş sayılırsınız. 
        Bu şartlar, Pulpax ile kullanıcısı (kliniğiniz) arasındaki yasal anlaşmayı oluşturur.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">1. Hizmet Kapsamı</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Pulpax, bulut tabanlı bir Klinik Yönetim Yazılımı (SaaS) sunmaktadır. Hizmetin kapsamı, seçilen abonelik planına göre 
        değişiklik gösterir. Şirket, sistem performansını artırmak amacıyla önceden bildirimde bulunmaksızın güncelleme yapma 
        hakkını saklı tutar.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">2. Kullanım Sorumluluğu</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
        Kullanıcı (Klinik), sisteme giriş yapılan şifrelerin güvenliğinden ve sistem içerisinde gerçekleştirilen tüm işlemlerden 
        doğrudan sorumludur. Hasta verilerinin girişinde yasal etik kurallara ve tıbbi gizliliğe uyulması Kullanıcı&apos;nın yükümlülüğündedir.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">3. Ödeme ve Abonelik</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Abonelik ücretleri, seçilen döneme (aylık/yıllık) göre peşin olarak tahsil edilir. Ödemesi yapılmayan hesapların 
        erişimi 7 günlük uyarı süresi sonunda kısıtlanabilir. İptal talepleri, fatura kesim tarihinden en az 3 iş günü önce bildirilmelidir.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">4. Veri Güvenliği ve Yedekleme</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Pulpax, verilerin korunması için endüstriyel standartlarda (SLA %99.9) güvenlik önlemleri almaktadır. Ancak, 
        doğal afetler veya siber saldırılar gibi mücbir sebeplerden kaynaklanabilecek veri kayıplarından dolayı Şirket&apos;in
        sorumluluğu sınırlandırılmıştır. Kullanıcılara düzenli veri dışa aktarımı (export) yapmaları önerilir.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">5. Fikri Mülkiyet</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Yazılımın tasarımı, kaynak kodları ve markası Pulpax&apos;a aittir. Yazılımın kopyalanması, tersine mühendislik yapılması
        veya izinsiz üçüncü şahıslara kullandırılması yasaktır.
      </p>
    </>
  );
}
