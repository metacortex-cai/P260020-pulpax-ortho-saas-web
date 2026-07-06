export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-8">Gizlilik ve Veri Güvenliği Politikası</h1>
      
      <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
        Pulpax olarak gizliliğiniz bizim için her şeyden önemlidir. Bu politika, hangi verileri topladığımızı, 
        bu verileri nasıl kullandığımızı ve verilerinizi nasıl koruduğumuzu açıklamaktadır.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">1. Toplanan Bilgiler</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Sistemimize kayıt olduğunuzda sağladığınız ad, soyad, e-posta, telefon gibi bilgiler ile kullanım sırasında 
        oluşan log kayıtları (IP adresi, giriş zamanları) ve kliniğiniz tarafından girilen hasta kayıtları sistemlerimizde barındırılır.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">2. Çerezler (Cookies)</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6 font-medium">
        Kullanıcı deneyimini iyileştirmek ve oturum güvenliğini sağlamak amacıyla teknik çerezler kullanmaktayız. 
        Bu çerezler kişisel davranışlarınızı takip etmek amacıyla değil, sadece sistemin çalışması için gereklidir.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">3. Veri Güvenliği Önlemleri</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Verileriniz Türkiye sınırları içerisindeki yüksek güvenlikli veri merkezlerinde barındırılır. 
        Tüm veri transferleri SSL sertifikaları ile şifrelenir. Hassas hasta verileri veritabanı seviyesinde 
        ekstra katmanlarla şifrelenmiş (encryption at rest) olarak saklanır.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">4. Üçüncü Taraflar</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Pulpax, verilerinizi asla reklam amaçlı üçüncü taraflara satmaz veya kiralamaz. Veri paylaşımı 
        yalnızca yasal makamların resmi talepleri doğrultusunda gerçekleştirilebilir.
      </p>

      <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">5. Politika Güncellemeleri</h3>
      <p className="text-slate-600 dark:text-slate-400 mb-6">
        Teknolojik gelişmelere bağlı olarak gizlilik politikamızda zaman zaman güncellemeler yapabiliriz. 
        Yapılan önemli değişiklikler sistem üzerinden size bildirilecektir.
      </p>
    </>
  );
}
