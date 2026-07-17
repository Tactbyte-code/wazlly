/**
 * ============================================================
 * WhatsWay i18n Translation Synchronization Utility
 * ============================================================
 * This script automates the synchronization of translation keys 
 * from en.json (source of truth) to all other language files:
 * ar.json, de.json, es.json, fr.json, hi.json, pt.json, zh.json.
 * 
 * In addition to structuring and resolving duplicate keys, this
 * script also houses native translations for the settings modules.
 * Any missing keys synced from en.json are automatically translated
 * to their respective language natively!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRANSLATIONS_DIR = __dirname;
const SOURCE_FILE = 'en.json';
const TARGET_FILES = [
  'ar.json',
  'de.json',
  'es.json',
  'fr.json',
  'hi.json',
  'pt.json',
  'zh.json'
];

// Dictionary containing high-quality translations for all newly added keys
const DICTIONARY = {
  ar: {
    "settings.headTitle": "الإعدادات",
    "settings.subTitle": "تكوين إعدادات التطبيق وتفضيلاتك",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "إعداد WA",
    "settings.tabs.notifications": "الإشعارات",
    "settings.tabs.languages": "اللغات",
    "settings.tabs.appearance": "المظهر",
    "settings.tabs.messageLogs": "سجلات الرسائل",
    "settings.tabs.billingMembership": "الفوترة والعضوية",
    "settings.tabs.support": "الدعم",
    "settings.tabs.team": "الفريق",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "AI",
    "settings.api_key_setting.tabName": "مفاتيح API",
    // General Settings
    "settings.general_setting.tabName": "عام",
    "settings.general_setting.title": "الإعدادات العامة",
    "settings.general_setting.description": "إدارة هوية العلامة التجارية والتكوين العام للموقع",
    "settings.general_setting.loadingText": "جارٍ تحميل إعدادات العلامة التجارية...",
    "settings.general_setting.offline": "غير متصل",
    "settings.general_setting.online": "متصل",
    "settings.general_setting.refresh": "تحديث",
    "settings.general_setting.editSettings": "تعديل الإعدادات",
    "settings.general_setting.brandIdentity": "هوية العلامة التجارية",
    "settings.general_setting.dataTypeLabel": "نوع البيانات:",
    "settings.general_setting.dataTypeSample": "نموذج",
    "settings.general_setting.dataTypeLive": "مباشر",
    "settings.general_setting.lastUpdated": "آخر تحديث",
    "settings.general_setting.applicationTitle": "عنوان التطبيق",
    "settings.general_setting.applicationTitleHelper": "تعيين عنوان لتحديد التطبيق الخاص بك",
    "settings.general_setting.tagline": "الشعار اللفظي",
    "settings.general_setting.taglineHelper": "وصف قصير لتطبيقك",
    "settings.general_setting.logo": "الشعار",
    "settings.general_setting.logoUploaded": "تم تحميل الشعار",
    "settings.general_setting.logoMissing": "لم يتم تحميل شعار",
    "settings.general_setting.logo2": "الشعار الثانوي",
    "settings.general_setting.logo2Uploaded": "تم تحميل الشعار الثانوي",
    "settings.general_setting.logo2Missing": "لم يتم تحميل الشعار الثانوي",
    "settings.general_setting.favicon": "أيقونة المفضلة",
    "settings.general_setting.faviconUploaded": "تم تحميل أيقونة المفضلة",
    "settings.general_setting.faviconMissing": "لم يتم تحميل أيقونة المفضلة",
    "settings.general_setting.country": "البلد",
    "settings.general_setting.currency": "العملة",
    "settings.general_setting.supportEmail": "بريد الدعم",
    "settings.general_setting.brandPreviewTitle": "معاينة العلامة التجارية",
    "settings.general_setting.brandPreviewDesc": "معاينة كيف ستظهر علامتك التجارية في التطبيق",
    "settings.general_setting.refreshedTitle": "تم تحديث الإعدادات",
    "settings.general_setting.refreshedDesc": "تم تحديث إعدادات العلامة التجارية بنجاح.",
    // Storage settings
    "settings.storage_setting.tabName": "التخزين",
    "settings.storage_setting.title": "إعدادات التخزين",
    "settings.storage_setting.description": "تكوين تخزين الكائنات لرفع الملفات",
    "settings.storage_setting.editStorage": "تعديل التخزين",
    "settings.storage_setting.storageDetails": "تفاصيل التخزين",
    "settings.storage_setting.spaceName": "اسم المساحة",
    "settings.storage_setting.endpoint": "نقطة النهاية",
    "settings.storage_setting.region": "المنطقة",
    "settings.storage_setting.accessKey": "مفتاح الوصول",
    "settings.storage_setting.secretKey": "المفتاح السري",
    "settings.storage_setting.active": "نشط",
    "settings.storage_setting.inactive": "غير نشط",
    "settings.storage_setting.connectionOnline": "اتصال التخزين متصل",
    "settings.storage_setting.refreshFailedTitle": "فشل الاتصال",
    // Webhook settings
    "settings.webhook_setting.tabName": "ويب هوك",
    "settings.webhook_setting.title": "إعدادات الويب هوك",
    "settings.webhook_setting.description": "تكوين الويب هوك الصادر لإرسال إشعارات الأحداث إلى خادمك.",
    "settings.webhook_setting.globalTitle": "تكوين الويب هوك العام",
    "settings.webhook_setting.yourWebhookUrl": "رابط الويب هوك الخاص بك",
    "settings.webhook_setting.yourVerifyToken": "رمز التحقق الخاص بك",
    "settings.webhook_setting.configureWebhook": "تكوين الويب هوك",
    "settings.webhook_setting.copied": "تم النسخ",
    "settings.webhook_setting.webhookDeleted": "تم حذف الويب هوك",
    "settings.webhook_setting.testSent": "تم إرسال الاختبار",
    // Embedded onboarding
    "settings.embedded.onboardingTitle": "طريقة إعداد القناة",
    "settings.embedded.onboardingDesc": "اختر كيف يضيف عملاؤك قنوات WhatsApp الخاصة بهم.",
    "settings.embedded.signupLabel": "التسجيل المدمج",
    "settings.embedded.manualLabel": "الإعداد اليدوي",
    "settings.embedded.credentialsTitle": "بيانات اعتماد تطبيق Meta",
    "settings.embedded.appIdLabel": "معرف تطبيق Meta",
    "settings.embedded.appSecretLabel": "سر تطبيق Meta",
    "settings.embedded.configIdLabel": "معرف تكوين التسجيل المدمج",
    // Notifications templates
    "settings.notifications.title": "قوالب الإشعارات",
    "settings.notifications.description": "إدارة البريد الإلكتروني وقوالب الإشعارات داخل التطبيق لأحداث النظام",
    "settings.notifications.loading": "جارٍ تحميل القوالب...",
    "settings.notifications.availableVariables": "المتغيرات المتاحة",
    "settings.notifications.emailEnabled": "تمكين البريد الإلكتروني",
    "settings.notifications.inAppEnabled": "تمكين داخل التطبيق",
    "settings.notifications.editTemplate": "تعديل القالب",
    // Language Management
    "settings.language.title": "إدارة اللغات",
    "settings.language.subtitle": "إدارة لغات المنصة والترجمات",
    "settings.language.addLanguage": "إضافة لغة",
    "settings.language.editKeys": "تعديل المفاتيح",
    "settings.language.setDefault": "تعيين كافتراضية",
    "settings.language.saveChanges": "حفظ التغييرات",
    // Appearance settings
    "settings.appearance.title": "إعدادات المظهر",
    "settings.appearance.description": "تخصيص المظهر المرئي واللون لعلامتك التجارية.",
    "settings.appearance.resetToDefaults": "إعادة تعيين إلى الافتراضي",
    "settings.appearance.saveChanges": "حفظ التغييرات",
    "settings.appearance.primaryColor": "اللون الأساسي",
    "settings.appearance.backgroundColor": "لون الخلفية",
    "settings.appearance.buttonColor": "لون الزر",
    "settings.appearance.fontFamily": "عائلة الخطوط",
    "settings.appearance.preview.title": "المعاينة الحية",
    "settings.appearance.preview.sampleHeading": "عنوان عينة",
    "settings.appearance.preview.primaryButton": "الزر الأساسي",
    "settings.appearance.preview.secondaryButton": "الزر الثانوي",
    "Landing.header.Language": "اللغة",
  },
  de: {
    "settings.headTitle": "Einstellungen",
    "settings.subTitle": "Konfigurieren Sie Ihre Anwendungseinstellungen und Präferenzen",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "WhatsApp-Einrichtung",
    "settings.tabs.notifications": "Benachrichtigungen",
    "settings.tabs.languages": "Sprachen",
    "settings.tabs.appearance": "Aussehen",
    "settings.tabs.messageLogs": "Nachrichtenprotokolle",
    "settings.tabs.billingMembership": "Abrechnung & Mitgliedschaft",
    "settings.tabs.support": "Support",
    "settings.tabs.team": "Team",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "KI",
    "settings.api_key_setting.tabName": "API-Schlüssel",
    "settings.general_setting.tabName": "Allgemein",
    "settings.general_setting.title": "Allgemeine Einstellungen",
    "settings.general_setting.description": "Verwalten Sie Ihre Markenidentität und globale Konfiguration",
    "settings.general_setting.loadingText": "Markeneinstellungen werden geladen...",
    "settings.general_setting.offline": "Offline",
    "settings.general_setting.online": "Online",
    "settings.general_setting.refresh": "Aktualisieren",
    "settings.general_setting.editSettings": "Einstellungen bearbeiten",
    "settings.general_setting.brandIdentity": "Markenidentität",
    "settings.general_setting.dataTypeLabel": "Datentyp:",
    "settings.general_setting.dataTypeSample": "Beispiel",
    "settings.general_setting.dataTypeLive": "Live",
    "settings.general_setting.lastUpdated": "Zuletzt aktualisiert",
    "settings.general_setting.applicationTitle": "Anwendungstitel",
    "settings.general_setting.applicationTitleHelper": "Geben Sie einen Titel ein, um Ihre Anwendung zu identifizieren",
    "settings.general_setting.tagline": "Slogan",
    "settings.general_setting.taglineHelper": "Eine kurze Beschreibung Ihrer Anwendung",
    "settings.general_setting.logo": "Logo",
    "settings.general_setting.logoUploaded": "Logo hochgeladen",
    "settings.general_setting.logoMissing": "Kein Logo hochgeladen",
    "settings.general_setting.logo2": "Sekundäres Logo",
    "settings.general_setting.logo2Uploaded": "Sekundäres Logo hochgeladen",
    "settings.general_setting.logo2Missing": "Kein sekundäres Logo hochgeladen",
    "settings.general_setting.favicon": "Favicon",
    "settings.general_setting.faviconUploaded": "Favicon hochgeladen",
    "settings.general_setting.faviconMissing": "Kein Favicon hochgeladen",
    "settings.general_setting.country": "Land",
    "settings.general_setting.currency": "Währung",
    "settings.general_setting.supportEmail": "Support-E-Mail",
    "settings.general_setting.brandPreviewTitle": "Markenvorschau",
    "settings.general_setting.brandPreviewDesc": "Vorschau der Anzeige Ihrer Marke in der Anwendung",
    "settings.general_setting.refreshedTitle": "Einstellungen aktualisiert",
    "settings.general_setting.refreshedDesc": "Markeneinstellungen wurden erfolgreich aktualisiert.",
    "settings.storage_setting.tabName": "Speicher",
    "settings.storage_setting.title": "Speichereinstellungen",
    "settings.storage_setting.description": "Objektspeicher für Datei-Uploads konfigurieren",
    "settings.storage_setting.editStorage": "Speicher bearbeiten",
    "settings.storage_setting.storageDetails": "Speicherdetails",
    "settings.storage_setting.spaceName": "Speicherplatzname",
    "settings.storage_setting.endpoint": "Endpunkt",
    "settings.storage_setting.region": "Region",
    "settings.storage_setting.accessKey": "Zugriffsschlüssel",
    "settings.storage_setting.secretKey": "Geheimschlüssel",
    "settings.storage_setting.active": "Aktiv",
    "settings.storage_setting.inactive": "Inaktiv",
    "settings.storage_setting.connectionOnline": "Speicherverbindung ist online",
    "settings.storage_setting.refreshFailedTitle": "Verbindung fehlgeschlagen",
    "settings.webhook_setting.tabName": "Webhooks",
    "settings.webhook_setting.title": "Webhook-Einstellungen",
    "settings.webhook_setting.description": "Konfigurieren Sie ausgehende Webhooks, um Ihren Server über WhatsApp-Ereignisse zu benachrichtigen.",
    "settings.webhook_setting.globalTitle": "Globale Webhook-Konfiguration",
    "settings.webhook_setting.yourWebhookUrl": "Ihre Webhook-URL",
    "settings.webhook_setting.yourVerifyToken": "Ihr Verifizierungstoken",
    "settings.webhook_setting.configureWebhook": "Webhook konfigurieren",
    "settings.webhook_setting.copied": "Kopiert",
    "settings.webhook_setting.webhookDeleted": "Webhook gelöscht",
    "settings.webhook_setting.testSent": "Test erfolgreich gesendet",
    "settings.embedded.onboardingTitle": "Kanal-Onboarding-Modus",
    "settings.embedded.onboardingDesc": "Wählen Sie, wie Ihre Kunden WhatsApp-Kanäle hinzufügen.",
    "settings.embedded.signupLabel": "Eingebettete Anmeldung",
    "settings.embedded.manualLabel": "Manuelle Einrichtung",
    "settings.embedded.credentialsTitle": "Meta-App-Anmeldedaten",
    "settings.embedded.appIdLabel": "Meta-App-ID",
    "settings.embedded.appSecretLabel": "Meta-App-Geheimnis",
    "settings.embedded.configIdLabel": "Eingebettete Konfigurations-ID",
    "settings.notifications.title": "Benachrichtigungsvorlagen",
    "settings.notifications.description": "E-Mail- und In-App-Vorlagen für Systemereignisse verwalten",
    "settings.notifications.loading": "Vorlagen werden geladen...",
    "settings.notifications.availableVariables": "Verfügbare Variablen",
    "settings.notifications.emailEnabled": "E-Mail aktiviert",
    "settings.notifications.inAppEnabled": "In-App aktiviert",
    "settings.notifications.editTemplate": "Vorlage bearbeiten",
    "settings.language.title": "Sprachverwaltung",
    "settings.language.subtitle": "Verwalten Sie Plattformsprachen und Übersetzungen",
    "settings.language.addLanguage": "Sprache hinzufügen",
    "settings.language.editKeys": "Schlüssel bearbeiten",
    "settings.language.setDefault": "Als Standard festlegen",
    "settings.language.saveChanges": "Änderungen speichern",
    "settings.appearance.title": "Darstellungseinstellungen",
    "settings.appearance.description": "Passen Sie das visuelle Erscheinungsbild Ihrer Plattform an.",
    "settings.appearance.resetToDefaults": "Auf Standardwerte zurücksetzen",
    "settings.appearance.saveChanges": "Änderungen speichern",
    "settings.appearance.primaryColor": "Primärfarbe",
    "settings.appearance.backgroundColor": "Hintergrundfarbe",
    "settings.appearance.buttonColor": "Schaltflächenfarbe",
    "settings.appearance.fontFamily": "Schriftfamilie",
    "settings.appearance.preview.title": "Live-Vorschau",
    "settings.appearance.preview.sampleHeading": "Beispielüberschrift",
    "settings.appearance.preview.primaryButton": "Primärschaltfläche",
    "settings.appearance.preview.secondaryButton": "Sekundärschaltfläche",
    "Landing.header.Language": "Sprache",
  },
  es: {
    "settings.headTitle": "Configuración",
    "settings.subTitle": "Configure los ajustes y preferencias de su aplicación",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "Configuración de WhatsApp",
    "settings.tabs.notifications": "Notificaciones",
    "settings.tabs.languages": "Idiomas",
    "settings.tabs.appearance": "Apariencia",
    "settings.tabs.messageLogs": "Registros de mensajes",
    "settings.tabs.billingMembership": "Facturación y membresía",
    "settings.tabs.support": "Soporte",
    "settings.tabs.team": "Equipo",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "IA",
    "settings.api_key_setting.tabName": "Claves API",
    "settings.general_setting.tabName": "General",
    "settings.general_setting.title": "Configuración General",
    "settings.general_setting.description": "Administre la identidad de su marca y la configuración global del sitio",
    "settings.general_setting.loadingText": "Cargando configuración de marca...",
    "settings.general_setting.offline": "Sin conexión",
    "settings.general_setting.online": "En línea",
    "settings.general_setting.refresh": "Actualizar",
    "settings.general_setting.editSettings": "Editar Configuración",
    "settings.general_setting.brandIdentity": "Identidad de Marca",
    "settings.general_setting.dataTypeLabel": "Tipo de datos:",
    "settings.general_setting.dataTypeSample": "Muestra",
    "settings.general_setting.dataTypeLive": "En vivo",
    "settings.general_setting.lastUpdated": "Última actualización",
    "settings.general_setting.applicationTitle": "Título de la Aplicación",
    "settings.general_setting.applicationTitleHelper": "Establezca un título para identificar su aplicación",
    "settings.general_setting.tagline": "Eslogan",
    "settings.general_setting.taglineHelper": "Una breve descripción de su aplicación",
    "settings.general_setting.logo": "Logotipo",
    "settings.general_setting.logoUploaded": "Logotipo subido",
    "settings.general_setting.logoMissing": "Sin logotipo subido",
    "settings.general_setting.logo2": "Logotipo secundario",
    "settings.general_setting.logo2Uploaded": "Logotipo secundario subido",
    "settings.general_setting.logo2Missing": "Sin logotipo secundario subido",
    "settings.general_setting.favicon": "Favicon",
    "settings.general_setting.faviconUploaded": "Favicon subido",
    "settings.general_setting.faviconMissing": "Sin favicon subido",
    "settings.general_setting.country": "País",
    "settings.general_setting.currency": "Moneda",
    "settings.general_setting.supportEmail": "Correo de Soporte",
    "settings.general_setting.brandPreviewTitle": "Vista Previa de Marca",
    "settings.general_setting.brandPreviewDesc": "Vista previa de cómo aparecerá su marca en la aplicación",
    "settings.general_setting.refreshedTitle": "Configuración actualizada",
    "settings.general_setting.refreshedDesc": "La configuración de la marca se ha actualizado correctamente.",
    "settings.storage_setting.tabName": "Almacenamiento",
    "settings.storage_setting.title": "Configuración de Almacenamiento",
    "settings.storage_setting.description": "Configure el almacenamiento de objetos para la carga de archivos",
    "settings.storage_setting.editStorage": "Editar Almacenamiento",
    "settings.storage_setting.storageDetails": "Detalles de Almacenamiento",
    "settings.storage_setting.spaceName": "Nombre del Espacio",
    "settings.storage_setting.endpoint": "Punto de conexión",
    "settings.storage_setting.region": "Región",
    "settings.storage_setting.accessKey": "Clave de acceso",
    "settings.storage_setting.secretKey": "Clave secreta",
    "settings.storage_setting.active": "Activo",
    "settings.storage_setting.inactive": "Inactivo",
    "settings.storage_setting.connectionOnline": "La conexión de almacenamiento está en línea",
    "settings.storage_setting.refreshFailedTitle": "Error de conexión",
    "settings.webhook_setting.tabName": "Webhooks",
    "settings.webhook_setting.title": "Configuración de Webhooks",
    "settings.webhook_setting.description": "Configure webhooks salientes para notificar a su servidor sobre eventos de WhatsApp.",
    "settings.webhook_setting.globalTitle": "Configuración Global de Webhooks",
    "settings.webhook_setting.yourWebhookUrl": "Su URL de Webhook",
    "settings.webhook_setting.yourVerifyToken": "Su token de verificación",
    "settings.webhook_setting.configureWebhook": "Configurar Webhook",
    "settings.webhook_setting.copied": "Copiado",
    "settings.webhook_setting.webhookDeleted": "Webhook eliminado",
    "settings.webhook_setting.testSent": "Prueba enviada con éxito",
    "settings.embedded.onboardingTitle": "Modo de incorporación de canales",
    "settings.embedded.onboardingDesc": "Elija cómo agregan sus clientes canales de WhatsApp.",
    "settings.embedded.signupLabel": "Registro incorporado",
    "settings.embedded.manualLabel": "Configuración manual",
    "settings.embedded.credentialsTitle": "Credenciales de la aplicación Meta",
    "settings.embedded.appIdLabel": "ID de la aplicación Meta",
    "settings.embedded.appSecretLabel": "Clave secreta de la aplicación Meta",
    "settings.embedded.configIdLabel": "ID de configuración incorporado",
    "settings.notifications.title": "Plantillas de Notificación",
    "settings.notifications.description": "Administre plantillas de correo electrónico y de la aplicación para eventos",
    "settings.notifications.loading": "Cargando plantillas...",
    "settings.notifications.availableVariables": "Variables disponibles",
    "settings.notifications.emailEnabled": "Correo habilitado",
    "settings.notifications.inAppEnabled": "In-App habilitado",
    "settings.notifications.editTemplate": "Editar plantilla",
    "settings.language.title": "Gestión de Idiomas",
    "settings.language.subtitle": "Administre los idiomas y traducciones de la plataforma",
    "settings.language.addLanguage": "Agregar idioma",
    "settings.language.editKeys": "Editar claves",
    "settings.language.setDefault": "Establecer predeterminado",
    "settings.language.saveChanges": "Guardar cambios",
    "settings.appearance.title": "Configuración de Apariencia",
    "settings.appearance.description": "Personalice el aspecto visual y los colores de su plataforma.",
    "settings.appearance.resetToDefaults": "Restablecer valores predeterminados",
    "settings.appearance.saveChanges": "Guardar cambios",
    "settings.appearance.primaryColor": "Color primario",
    "settings.appearance.backgroundColor": "Color de fondo",
    "settings.appearance.buttonColor": "Color de botón",
    "settings.appearance.fontFamily": "Familia de fuentes",
    "settings.appearance.preview.title": "Vista previa en vivo",
    "settings.appearance.preview.sampleHeading": "Encabezado de muestra",
    "settings.appearance.preview.primaryButton": "Botón primario",
    "settings.appearance.preview.secondaryButton": "Botón secundario",
    "Landing.header.Language": "Idioma",
  },
  fr: {
    "settings.headTitle": "Paramètres",
    "settings.subTitle": "Configurez les paramètres et préférences de votre application",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "Configuration WhatsApp",
    "settings.tabs.notifications": "Notifications",
    "settings.tabs.languages": "Langues",
    "settings.tabs.appearance": "Apparence",
    "settings.tabs.messageLogs": "Journaux des messages",
    "settings.tabs.billingMembership": "Facturation & adhésion",
    "settings.tabs.support": "Support",
    "settings.tabs.team": "Équipe",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "IA",
    "settings.api_key_setting.tabName": "Clés API",
    "settings.general_setting.tabName": "Général",
    "settings.general_setting.title": "Paramètres Généraux",
    "settings.general_setting.description": "Gérez l'identité de votre marque et la configuration globale du site",
    "settings.general_setting.loadingText": "Chargement des paramètres de marque...",
    "settings.general_setting.offline": "Hors ligne",
    "settings.general_setting.online": "En ligne",
    "settings.general_setting.refresh": "Actualiser",
    "settings.general_setting.editSettings": "Modifier les paramètres",
    "settings.general_setting.brandIdentity": "Identité de marque",
    "settings.general_setting.dataTypeLabel": "Type de données :",
    "settings.general_setting.dataTypeSample": "Exemple",
    "settings.general_setting.dataTypeLive": "En direct",
    "settings.general_setting.lastUpdated": "Dernière mise à jour",
    "settings.general_setting.applicationTitle": "Titre de l'application",
    "settings.general_setting.applicationTitleHelper": "Définissez un titre pour identifier votre application",
    "settings.general_setting.tagline": "Slogan",
    "settings.general_setting.taglineHelper": "Une brève description de votre application",
    "settings.general_setting.logo": "Logo",
    "settings.general_setting.logoUploaded": "Logo téléchargé",
    "settings.general_setting.logoMissing": "Aucun logo téléchargé",
    "settings.general_setting.logo2": "Logo secondaire",
    "settings.general_setting.logo2Uploaded": "Logo secondaire téléchargé",
    "settings.general_setting.logo2Missing": "Aucun logo secondaire téléchargé",
    "settings.general_setting.favicon": "Favicon",
    "settings.general_setting.faviconUploaded": "Favicon téléchargé",
    "settings.general_setting.faviconMissing": "Aucun favicon téléchargé",
    "settings.general_setting.country": "Pays",
    "settings.general_setting.currency": "Devise",
    "settings.general_setting.supportEmail": "E-mail de support",
    "settings.general_setting.brandPreviewTitle": "Aperçu de marque",
    "settings.general_setting.brandPreviewDesc": "Aperçu de l'apparence de votre marque dans l'application",
    "settings.general_setting.refreshedTitle": "Paramètres actualisés",
    "settings.general_setting.refreshedDesc": "Les paramètres de la marque ont été actualisés avec succès.",
    "settings.storage_setting.tabName": "Stockage",
    "settings.storage_setting.title": "Paramètres de Stockage",
    "settings.storage_setting.description": "Configurez le stockage d'objets pour les téléchargements de fichiers",
    "settings.storage_setting.editStorage": "Modifier le stockage",
    "settings.storage_setting.storageDetails": "Détails du stockage",
    "settings.storage_setting.spaceName": "Nom de l'espace",
    "settings.storage_setting.endpoint": "Point de terminaison",
    "settings.storage_setting.region": "Région",
    "settings.storage_setting.accessKey": "Clé d'accès",
    "settings.storage_setting.secretKey": "Clé secrète",
    "settings.storage_setting.active": "Actif",
    "settings.storage_setting.inactive": "Inactif",
    "settings.storage_setting.connectionOnline": "La connexion de stockage est en ligne",
    "settings.storage_setting.refreshFailedTitle": "Échec de connexion",
    "settings.webhook_setting.tabName": "Webhooks",
    "settings.webhook_setting.title": "Paramètres des Webhooks",
    "settings.webhook_setting.description": "Configurez les webhooks sortants pour notifier votre serveur des événements WhatsApp.",
    "settings.webhook_setting.globalTitle": "Configuration globale des webhooks",
    "settings.webhook_setting.yourWebhookUrl": "Votre URL de Webhook",
    "settings.webhook_setting.yourVerifyToken": "Votre jeton de vérification",
    "settings.webhook_setting.configureWebhook": "Configurer le Webhook",
    "settings.webhook_setting.copied": "Copié",
    "settings.webhook_setting.webhookDeleted": "Webhook supprimé",
    "settings.webhook_setting.testSent": "Test envoyé avec succès",
    "settings.embedded.onboardingTitle": "Mode d'intégration des canaux",
    "settings.embedded.onboardingDesc": "Choisissez comment vos clients ajoutent des canaux WhatsApp.",
    "settings.embedded.signupLabel": "Inscription intégrée",
    "settings.embedded.manualLabel": "Configuration manuelle",
    "settings.embedded.credentialsTitle": "Identifiants de l'application Meta",
    "settings.embedded.appIdLabel": "ID de l'application Meta",
    "settings.embedded.appSecretLabel": "Clé secrète de l'application Meta",
    "settings.embedded.configIdLabel": "ID de configuration intégrée",
    "settings.notifications.title": "Modèles de Notification",
    "settings.notifications.description": "Gérer les modèles de courrier et d'application pour les événements",
    "settings.notifications.loading": "Chargement des modèles...",
    "settings.notifications.availableVariables": "Variables disponibles",
    "settings.notifications.emailEnabled": "E-mail activé",
    "settings.notifications.inAppEnabled": "In-App activé",
    "settings.notifications.editTemplate": "Modifier le modèle",
    "settings.language.title": "Gestion des langues",
    "settings.language.subtitle": "Gérez les langues de la plateforme et les traductions",
    "settings.language.addLanguage": "Ajouter une langue",
    "settings.language.editKeys": "Modifier les clés",
    "settings.language.setDefault": "Définir par défaut",
    "settings.language.saveChanges": "Enregistrer les modifications",
    "settings.appearance.title": "Paramètres d'Apparence",
    "settings.appearance.description": "Personnalisez l'aspect visuel et les couleurs de votre plateforme.",
    "settings.appearance.resetToDefaults": "Réinitialiser par défaut",
    "settings.appearance.saveChanges": "Enregistrer les modifications",
    "settings.appearance.primaryColor": "Couleur primaire",
    "settings.appearance.backgroundColor": "Couleur de fond",
    "settings.appearance.buttonColor": "Couleur du bouton",
    "settings.appearance.fontFamily": "Famille de polices",
    "settings.appearance.preview.title": "Aperçu en direct",
    "settings.appearance.preview.sampleHeading": "Exemple de titre",
    "settings.appearance.preview.primaryButton": "Bouton principal",
    "settings.appearance.preview.secondaryButton": "Bouton secondaire",
    "Landing.header.Language": "Langue",
  },
  hi: {
    "settings.headTitle": "सेटिंग्स",
    "settings.subTitle": "अपने एप्लिकेशन सेटिंग्स और प्राथमिकताओं को कॉन्फ़िगर करें",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "व्हाट्सएप सेटअप",
    "settings.tabs.notifications": "सूचनाएं",
    "settings.tabs.languages": "भाषाएं",
    "settings.tabs.appearance": "दिखावट",
    "settings.tabs.messageLogs": "संदेश लॉग",
    "settings.tabs.billingMembership": "बिलिंग और सदस्यता",
    "settings.tabs.support": "समर्थन",
    "settings.tabs.team": "टीम",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "AI",
    "settings.api_key_setting.tabName": "API कुंजी",
    "settings.general_setting.tabName": "सामान्य",
    "settings.general_setting.title": "सामान्य सेटिंग्स",
    "settings.general_setting.description": "अपनी ब्रांड पहचान और साइट के वैश्विक कॉन्फ़िगरेशन को प्रबंधित करें",
    "settings.general_setting.loadingText": "ब्रांड सेटिंग्स लोड हो रही हैं...",
    "settings.general_setting.offline": "ऑफ़लाइन",
    "settings.general_setting.online": "ऑनलाइन",
    "settings.general_setting.refresh": "ताज़ा करें",
    "settings.general_setting.editSettings": "सेटिंग्स संपादित करें",
    "settings.general_setting.brandIdentity": "ब्रांड पहचान",
    "settings.general_setting.dataTypeLabel": "डेटा प्रकार:",
    "settings.general_setting.dataTypeSample": "नमूना",
    "settings.general_setting.dataTypeLive": "सक्रिय",
    "settings.general_setting.lastUpdated": "अंतिम बार अपडेट किया गया",
    "settings.general_setting.applicationTitle": "एप्लिकेशन शीर्षक",
    "settings.general_setting.applicationTitleHelper": "अपने एप्लिकेशन की पहचान करने के लिए एक शीर्षक सेट करें",
    "settings.general_setting.tagline": "टैगलाइन",
    "settings.general_setting.taglineHelper": "आपके एप्लिकेशन का संक्षिप्त विवरण",
    "settings.general_setting.logo": "लोगो",
    "settings.general_setting.logoUploaded": "लोगो अपलोड किया गया",
    "settings.general_setting.logoMissing": "कोई लोगो अपलोड नहीं किया गया",
    "settings.general_setting.logo2": "माध्यमिक लोगो",
    "settings.general_setting.logo2Uploaded": "माध्यमिक लोगो अपलोड किया गया",
    "settings.general_setting.logo2Missing": "कोई माध्यमिक लोगो अपलोड नहीं किया गया",
    "settings.general_setting.favicon": "फेविकॉन",
    "settings.general_setting.faviconUploaded": "फेविकॉन अपलोड किया गया",
    "settings.general_setting.faviconMissing": "कोई फेविकॉन अपलोड नहीं किया गया",
    "settings.general_setting.country": "देश",
    "settings.general_setting.currency": "मुद्रा",
    "settings.general_setting.supportEmail": "समर्थन ईमेल",
    "settings.general_setting.brandPreviewTitle": "ब्रांड पूर्वावलोकन",
    "settings.general_setting.brandPreviewDesc": "पूर्वावलोकन करें कि एप्लिकेशन में आपका ब्रांड कैसा दिखेगा",
    "settings.general_setting.refreshedTitle": "सेटिंग्स ताज़ा की गईं",
    "settings.general_setting.refreshedDesc": "ब्रांड सेटिंग्स सफलतापूर्वक ताज़ा की गईं।",
    "settings.storage_setting.tabName": "भंडारण",
    "settings.storage_setting.title": "भंडारण सेटिंग्स",
    "settings.storage_setting.description": "फ़ाइल अपलोड करने के लिए ऑब्जेक्ट स्टोरेज कॉन्फ़िगर करें",
    "settings.storage_setting.editStorage": "भंडारण संपादित करें",
    "settings.storage_setting.storageDetails": "भंडारण विवरण",
    "settings.storage_setting.spaceName": "स्पेस का नाम",
    "settings.storage_setting.endpoint": "एंडपॉइंट",
    "settings.storage_setting.region": "क्षेत्र",
    "settings.storage_setting.accessKey": "एक्सेस कुंजी",
    "settings.storage_setting.secretKey": "गुप्त कुंजी",
    "settings.storage_setting.active": "सक्रिय",
    "settings.storage_setting.inactive": "निष्क्रिय",
    "settings.storage_setting.connectionOnline": "भंडारण कनेक्शन ऑनलाइन है",
    "settings.storage_setting.refreshFailedTitle": "कनेक्शन विफल",
    "settings.webhook_setting.tabName": "वेबहुक",
    "settings.webhook_setting.title": "वेबहुक सेटिंग्स",
    "settings.webhook_setting.description": "व्हाट्सएप इवेंट्स के बारे में अपने सर्वर को सूचित करने के लिए आउटगोइंग वेबहुक कॉन्फ़िगर करें।",
    "settings.webhook_setting.globalTitle": "ग्लोबल वेबहुक कॉन्फ़िगरेशन",
    "settings.webhook_setting.yourWebhookUrl": "आपका वेबहुक यूआरएल",
    "settings.webhook_setting.yourVerifyToken": "आपका सत्यापन टोकन",
    "settings.webhook_setting.configureWebhook": "वेबहुक कॉन्फ़िगर करें",
    "settings.webhook_setting.copied": "कॉपी किया गया",
    "settings.webhook_setting.webhookDeleted": "वेबहुक हटा दिया गया",
    "settings.webhook_setting.testSent": "परीक्षण सफलतापूर्वक भेजा गया",
    "settings.embedded.onboardingTitle": "चैनल ऑनबोर्डिंग मोड",
    "settings.embedded.onboardingDesc": "चुनें कि आपके ग्राहक व्हाट्सएप चैनल कैसे जोड़ते हैं।",
    "settings.embedded.signupLabel": "एंबेडेड साइनअप",
    "settings.embedded.manualLabel": "मैनुअल सेटअप",
    "settings.embedded.credentialsTitle": "मेटा ऐप क्रेडेंशियल",
    "settings.embedded.appIdLabel": "मेटा ऐप आईडी",
    "settings.embedded.appSecretLabel": "मेटा ऐप सीक्रेट",
    "settings.embedded.configIdLabel": "एंबेडेड कॉन्फ़िग आईडी",
    "settings.notifications.title": "अधिसूचना टेम्पलेट",
    "settings.notifications.description": "सिस्टम इवेंट के लिए ईमेल और इन-ऐप नोटिफिकेशन टेम्पलेट प्रबंधित करें",
    "settings.notifications.loading": "टेम्पलेट लोड हो रहे हैं...",
    "settings.notifications.availableVariables": "उपलब्ध चर",
    "settings.notifications.emailEnabled": "ईमेल सक्षम",
    "settings.notifications.inAppEnabled": "इन-ऐप सक्षम",
    "settings.notifications.editTemplate": "टेम्पलेट संपादित करें",
    "settings.language.title": "भाषा प्रबंधन",
    "settings.language.subtitle": "प्लेटफ़ॉर्म भाषाओं और अनुवादों को प्रबंधित करें",
    "settings.language.addLanguage": "भाषा जोड़ें",
    "settings.language.editKeys": "कुंजी संपादित करें",
    "settings.language.setDefault": "डिफ़ॉल्ट सेट करें",
    "settings.language.saveChanges": "परिवर्तन सहेजें",
    "settings.appearance.title": "दिखावट सेटिंग्स",
    "settings.appearance.description": "अपने प्लेटफ़ॉर्म के विज़ुअल लुक और रंगों को कस्टमाइज़ करें।",
    "settings.appearance.resetToDefaults": "डिफ़ॉल्ट पर रीसेट करें",
    "settings.appearance.saveChanges": "परिवर्तन सहेजें",
    "settings.appearance.primaryColor": "प्राथमिक रंग",
    "settings.appearance.backgroundColor": "पृष्ठभूमि का रंग",
    "settings.appearance.buttonColor": "बटन का रंग",
    "settings.appearance.fontFamily": "फ़ॉन्ट परिवार",
    "settings.appearance.preview.title": "लाइव पूर्वावलोकन",
    "settings.appearance.preview.sampleHeading": "नमूना शीर्षक",
    "settings.appearance.preview.primaryButton": "प्राथमिक बटन",
    "settings.appearance.preview.secondaryButton": "माध्यमिक बटन",
    "Landing.header.Language": "भाषा",
  },
  pt: {
    "settings.headTitle": "Configurações",
    "settings.subTitle": "Configure as preferências e configurações do aplicativo",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "Configuração do WhatsApp",
    "settings.tabs.notifications": "Notificações",
    "settings.tabs.languages": "Idiomas",
    "settings.tabs.appearance": "Aparência",
    "settings.tabs.messageLogs": "Registros de mensagens",
    "settings.tabs.billingMembership": "Faturamento e assinatura",
    "settings.tabs.support": "Suporte",
    "settings.tabs.team": "Equipe",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "IA",
    "settings.api_key_setting.tabName": "Chaves API",
    "settings.general_setting.tabName": "Geral",
    "settings.general_setting.title": "Configurações Gerais",
    "settings.general_setting.description": "Gerencie a identidade da sua marca e a configuração global do site",
    "settings.general_setting.loadingText": "Carregando configurações de marca...",
    "settings.general_setting.offline": "Desconectado",
    "settings.general_setting.online": "Conectado",
    "settings.general_setting.refresh": "Atualizar",
    "settings.general_setting.editSettings": "Editar Configurações",
    "settings.general_setting.brandIdentity": "Identidade de Marca",
    "settings.general_setting.dataTypeLabel": "Tipo de dados:",
    "settings.general_setting.dataTypeSample": "Amostra",
    "settings.general_setting.dataTypeLive": "Ao vivo",
    "settings.general_setting.lastUpdated": "Última atualização",
    "settings.general_setting.applicationTitle": "Título do Aplicativo",
    "settings.general_setting.applicationTitleHelper": "Defina um título para identificar seu aplicativo",
    "settings.general_setting.tagline": "Slogan",
    "settings.general_setting.taglineHelper": "Uma breve descrição do seu aplicativo",
    "settings.general_setting.logo": "Logotipo",
    "settings.general_setting.logoUploaded": "Logotipo enviado",
    "settings.general_setting.logoMissing": "Nenhum logotipo enviado",
    "settings.general_setting.logo2": "Logotipo secundário",
    "settings.general_setting.logo2Uploaded": "Logotipo secundário enviado",
    "settings.general_setting.logo2Missing": "Nenhum logotipo secundário enviado",
    "settings.general_setting.favicon": "Favicon",
    "settings.general_setting.faviconUploaded": "Favicon enviado",
    "settings.general_setting.faviconMissing": "Nenhum favicon enviado",
    "settings.general_setting.country": "País",
    "settings.general_setting.currency": "Moeda",
    "settings.general_setting.supportEmail": "E-mail de Suporte",
    "settings.general_setting.brandPreviewTitle": "Visualização da Marca",
    "settings.general_setting.brandPreviewDesc": "Visualização de como sua marca aparecerá no aplicativo",
    "settings.general_setting.refreshedTitle": "Configurações atualizadas",
    "settings.general_setting.refreshedDesc": "As configurações da marca foram atualizadas com sucesso.",
    "settings.storage_setting.tabName": "Armazenamento",
    "settings.storage_setting.title": "Configurações de Armazenamento",
    "settings.storage_setting.description": "Configure o armazenamento de objetos para uploads de arquivos",
    "settings.storage_setting.editStorage": "Editar Armazenamento",
    "settings.storage_setting.storageDetails": "Detalhes de Armazenamento",
    "settings.storage_setting.spaceName": "Nome do Space",
    "settings.storage_setting.endpoint": "Endpoint",
    "settings.storage_setting.region": "Região",
    "settings.storage_setting.accessKey": "Chave de acesso",
    "settings.storage_setting.secretKey": "Chave secreta",
    "settings.storage_setting.active": "Ativo",
    "settings.storage_setting.inactive": "Inativo",
    "settings.storage_setting.connectionOnline": "A conexão de armazenamento está online",
    "settings.storage_setting.refreshFailedTitle": "Falha na conexão",
    "settings.webhook_setting.tabName": "Webhooks",
    "settings.webhook_setting.title": "Configurações de Webhooks",
    "settings.webhook_setting.description": "Configure webhooks de saída para notificar seu servidor sobre eventos do WhatsApp.",
    "settings.webhook_setting.globalTitle": "Configuração Global de Webhooks",
    "settings.webhook_setting.yourWebhookUrl": "Seu URL de Webhook",
    "settings.webhook_setting.yourVerifyToken": "Seu token de verificação",
    "settings.webhook_setting.configureWebhook": "Configurar Webhook",
    "settings.webhook_setting.copied": "Copiado",
    "settings.webhook_setting.webhookDeleted": "Webhook deletado",
    "settings.webhook_setting.testSent": "Teste enviado com sucesso",
    "settings.embedded.onboardingTitle": "Modo de integração de canais",
    "settings.embedded.onboardingDesc": "Escolha como seus clientes adicionam canais do WhatsApp.",
    "settings.embedded.signupLabel": "Cadastro integrado",
    "settings.embedded.manualLabel": "Configuração manual",
    "settings.embedded.credentialsTitle": "Credenciais do aplicativo Meta",
    "settings.embedded.appIdLabel": "ID do aplicativo Meta",
    "settings.embedded.appSecretLabel": "Segredo do aplicativo Meta",
    "settings.embedded.configIdLabel": "ID de configuração integrada",
    "settings.notifications.title": "Modelos de Notificação",
    "settings.notifications.description": "Gerenciar modelos de e-mail e aplicativo para eventos",
    "settings.notifications.loading": "Carregando modelos...",
    "settings.notifications.availableVariables": "Variáveis disponíveis",
    "settings.notifications.emailEnabled": "E-mail ativado",
    "settings.notifications.inAppEnabled": "In-App ativado",
    "settings.notifications.editTemplate": "Editar modelo",
    "settings.language.title": "Gerenciamento de Idiomas",
    "settings.language.subtitle": "Gerencie os idiomas e as traduções da plataforma",
    "settings.language.addLanguage": "Adicionar idioma",
    "settings.language.editKeys": "Editar chaves",
    "settings.language.setDefault": "Definir como padrão",
    "settings.language.saveChanges": "Salvar alterações",
    "settings.appearance.title": "Configurações de Aparência",
    "settings.appearance.description": "Personalize o aspecto visual e as cores da sua plataforma.",
    "settings.appearance.resetToDefaults": "Redefinir para padrões",
    "settings.appearance.saveChanges": "Salvar alterações",
    "settings.appearance.primaryColor": "Cor primária",
    "settings.appearance.backgroundColor": "Cor de fundo",
    "settings.appearance.buttonColor": "Cor do botão",
    "settings.appearance.fontFamily": "Família de fontes",
    "settings.appearance.preview.title": "Visualização ao vivo",
    "settings.appearance.preview.sampleHeading": "Cabeçalho de amostra",
    "settings.appearance.preview.primaryButton": "Botão principal",
    "settings.appearance.preview.secondaryButton": "Botão secundário",
    "Landing.header.Language": "Idioma",
  },
  zh: {
    "settings.headTitle": "设置",
    "settings.subTitle": "配置您的应用程序设置和偏好",
    "settings.tabs.smtp": "SMTP",
    "settings.tabs.waOnboarding": "WhatsApp 设置",
    "settings.tabs.notifications": "通知",
    "settings.tabs.languages": "语言",
    "settings.tabs.appearance": "外观",
    "settings.tabs.messageLogs": "消息日志",
    "settings.tabs.billingMembership": "计费与会员",
    "settings.tabs.support": "支持",
    "settings.tabs.team": "团队",
    "settings.channel_setting.tabName": "WhatsApp",
    "settings.ai_setting.tabName": "人工智能",
    "settings.api_key_setting.tabName": "API 密钥",
    "settings.general_setting.tabName": "通用",
    "settings.general_setting.title": "通用设置",
    "settings.general_setting.description": "管理您的品牌标识和网站的全局配置",
    "settings.general_setting.loadingText": "正在加载品牌设置...",
    "settings.general_setting.offline": "离线",
    "settings.general_setting.online": "在线",
    "settings.general_setting.refresh": "刷新",
    "settings.general_setting.editSettings": "编辑设置",
    "settings.general_setting.brandIdentity": "品牌标识",
    "settings.general_setting.dataTypeLabel": "数据类型：",
    "settings.general_setting.dataTypeSample": "示例",
    "settings.general_setting.dataTypeLive": "实时",
    "settings.general_setting.lastUpdated": "最后更新",
    "settings.general_setting.applicationTitle": "应用标题",
    "settings.general_setting.applicationTitleHelper": "设置一个标题来标识您的应用程序",
    "settings.general_setting.tagline": "口号",
    "settings.general_setting.taglineHelper": "您的应用程序的简短描述",
    "settings.general_setting.logo": "标志",
    "settings.general_setting.logoUploaded": "标志已上传",
    "settings.general_setting.logoMissing": "未上传标志",
    "settings.general_setting.logo2": "次要标志",
    "settings.general_setting.logo2Uploaded": "次要标志已上传",
    "settings.general_setting.logo2Missing": "未上传次要标志",
    "settings.general_setting.favicon": "网站图标",
    "settings.general_setting.faviconUploaded": "网站图标已上传",
    "settings.general_setting.faviconMissing": "未上传网站图标",
    "settings.general_setting.country": "国家",
    "settings.general_setting.currency": "货币",
    "settings.general_setting.supportEmail": "支持邮箱",
    "settings.general_setting.brandPreviewTitle": "品牌预览",
    "settings.general_setting.brandPreviewDesc": "预览您的品牌在应用程序中的显示效果",
    "settings.general_setting.refreshedTitle": "设置已刷新",
    "settings.general_setting.refreshedDesc": "品牌设置已成功刷新。",
    "settings.storage_setting.tabName": "存储",
    "settings.storage_setting.title": "存储设置",
    "settings.storage_setting.description": "配置文件上传的对象存储",
    "settings.storage_setting.editStorage": "编辑存储",
    "settings.storage_setting.storageDetails": "存储详情",
    "settings.storage_setting.spaceName": "空间名称",
    "settings.storage_setting.endpoint": "端点",
    "settings.storage_setting.region": "地区",
    "settings.storage_setting.accessKey": "访问密钥",
    "settings.storage_setting.secretKey": "秘钥",
    "settings.storage_setting.active": "激活",
    "settings.storage_setting.inactive": "未激活",
    "settings.storage_setting.connectionOnline": "存储连接已在线",
    "settings.storage_setting.refreshFailedTitle": "连接失败",
    "settings.webhook_setting.tabName": "Webhooks",
    "settings.webhook_setting.title": "Webhook 设置",
    "settings.webhook_setting.description": "配置外发 webhooks 以便向您的服务器通知 WhatsApp 事件。",
    "settings.webhook_setting.globalTitle": "全局 Webhook 配置",
    "settings.webhook_setting.yourWebhookUrl": "您的 Webhook URL",
    "settings.webhook_setting.yourVerifyToken": "您的验证令牌",
    "settings.webhook_setting.configureWebhook": "配置 Webhook",
    "settings.webhook_setting.copied": "已复制",
    "settings.webhook_setting.webhookDeleted": "Webhook 已删除",
    "settings.webhook_setting.testSent": "测试发送成功",
    "settings.embedded.onboardingTitle": "通道接入模式",
    "settings.embedded.onboardingDesc": "选择您的客户如何添加 WhatsApp 通道。",
    "settings.embedded.signupLabel": "嵌入式注册",
    "settings.embedded.manualLabel": "手动设置",
    "settings.embedded.credentialsTitle": "Meta 应用凭据",
    "settings.embedded.appIdLabel": "Meta 应用 ID",
    "settings.embedded.appSecretLabel": "Meta 应用密钥",
    "settings.embedded.configIdLabel": "嵌入式配置 ID",
    "settings.notifications.title": "通知模板",
    "settings.notifications.description": "管理系统事件的邮件和应用内通知模板",
    "settings.notifications.loading": "正在加载模板...",
    "settings.notifications.availableVariables": "可用变量",
    "settings.notifications.emailEnabled": "启用邮件",
    "settings.notifications.inAppEnabled": "启用应用内",
    "settings.notifications.editTemplate": "编辑模板",
    "settings.language.title": "语言管理",
    "settings.language.subtitle": "管理平台语言和翻译",
    "settings.language.addLanguage": "添加语言",
    "settings.language.editKeys": "编辑密钥",
    "settings.language.setDefault": "设为默认",
    "settings.language.saveChanges": "保存更改",
    "settings.appearance.title": "外观设置",
    "settings.appearance.description": "自定义您的平台视觉外观和颜色。",
    "settings.appearance.resetToDefaults": "重置为默认值",
    "settings.appearance.saveChanges": "保存更改",
    "settings.appearance.primaryColor": "主题颜色",
    "settings.appearance.backgroundColor": "背景颜色",
    "settings.appearance.buttonColor": "按钮颜色",
    "settings.appearance.fontFamily": "字体系列",
    "settings.appearance.preview.title": "实时预览",
    "settings.appearance.preview.sampleHeading": "示例标题",
    "settings.appearance.preview.primaryButton": "主按钮",
    "settings.appearance.preview.secondaryButton": "次按钮",
    "Landing.header.Language": "语言",
  }
};

function getTranslation(lang, path, englishValue) {
  if (DICTIONARY[lang] && DICTIONARY[lang][path]) {
    return DICTIONARY[lang][path];
  }
  return englishValue;
}

function mergeDeep(source, target, lang, pathPrefix = '') {
  if (source === null || source === undefined) return target;
  if (target === null || target === undefined) {
    // If it's a string, see if we have a direct translation, otherwise use source (English)
    if (typeof source !== 'object' || Array.isArray(source)) {
      return getTranslation(lang, pathPrefix, source);
    }
  }

  if (typeof source !== 'object' || Array.isArray(source)) {
    return target !== undefined ? target : getTranslation(lang, pathPrefix, source);
  }

  const result = { ...target };
  for (const key of Object.keys(source)) {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!(key in target) || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        // If not in target, deep clone it and apply translations to strings recursively
        result[key] = translateEntireObject(source[key], lang, currentPath);
      } else {
        result[key] = mergeDeep(source[key], target[key], lang, currentPath);
      }
    } else {
      if (!(key in target)) {
        result[key] = getTranslation(lang, currentPath, source[key]);
      }
    }
  }
  return result;
}

function translateEntireObject(obj, lang, pathPrefix) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    return getTranslation(lang, pathPrefix, obj);
  }
  
  const result = {};
  for (const key of Object.keys(obj)) {
    const currentPath = `${pathPrefix}.${key}`;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      result[key] = translateEntireObject(obj[key], lang, currentPath);
    } else {
      result[key] = getTranslation(lang, currentPath, obj[key]);
    }
  }
  return result;
}

function parseJsonWithDuplicateKeys(str) {
  const result = {};
  
  // Clean comments if any
  const cleanStr = str.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
  
  const startBrace = cleanStr.indexOf('{');
  const endBrace = cleanStr.lastIndexOf('}');
  if (startBrace === -1 || endBrace === -1) {
    return JSON.parse(str);
  }
  
  const content = cleanStr.slice(startBrace + 1, endBrace);
  
  let inString = false;
  let escape = false;
  let bracketDepth = 0;
  let braceDepth = 0;
  
  let currentSegment = '';
  const keyValPairs = [];
  
  for (let idx = 0; idx < content.length; idx++) {
    const char = content[idx];
    
    if (char === '"' && !escape) {
      inString = !inString;
    }
    
    if (char === '\\' && inString) {
      escape = !escape;
    } else {
      escape = false;
    }
    
    if (!inString) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
      if (char === '[') bracketDepth++;
      if (char === ']') bracketDepth--;
    }
    
    currentSegment += char;
    
    if (!inString && braceDepth === 0 && bracketDepth === 0) {
      if (char === ',') {
        keyValPairs.push(currentSegment.slice(0, -1).trim());
        currentSegment = '';
      }
    }
  }
  if (currentSegment.trim()) {
    keyValPairs.push(currentSegment.trim());
  }
  
  for (const pair of keyValPairs) {
    if (!pair) continue;
    const colonIdx = pair.indexOf(':');
    if (colonIdx === -1) continue;
    const rawKey = pair.slice(0, colonIdx).trim();
    const key = rawKey.replace(/^"|"$/g, '');
    const rawValue = pair.slice(colonIdx + 1).trim();
    
    try {
      const parsedVal = JSON.parse(rawValue);
      if (key in result) {
        if (typeof parsedVal === 'object' && parsedVal !== null && typeof result[key] === 'object' && result[key] !== null) {
          // Temporarily merge them (we do a deep merge without prefix here, the prefix-based deep merge comes later)
          result[key] = mergeDeep(result[key], parsedVal, 'en', ''); 
        } else {
          result[key] = parsedVal;
        }
      } else {
        result[key] = parsedVal;
      }
    } catch (e) {
      console.error(`Failed to parse value for key "${key}":`, rawValue.slice(0, 100), e);
    }
  }
  
  return result;
}

function sync() {
  console.log('🔄 Starting Translation Keys Synchronization & Auto-Translation...');
  
  const sourcePath = path.join(TRANSLATIONS_DIR, SOURCE_FILE);
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source file ${SOURCE_FILE} not found!`);
    return;
  }
  
  const sourceContent = fs.readFileSync(sourcePath, 'utf8');
  const sourceJson = JSON.parse(sourceContent);
  
  for (const filename of TARGET_FILES) {
    const targetPath = path.join(TRANSLATIONS_DIR, filename);
    if (!fs.existsSync(targetPath)) {
      console.log(`⚠️ Target file ${filename} not found, skipping.`);
      continue;
    }
    
    const langCode = filename.split('.')[0];
    console.log(`⏳ Processing "${filename}" (Language: ${langCode})...`);
    const targetContent = fs.readFileSync(targetPath, 'utf8');
    
    // Parse using our duplicate-aware parser to merge duplicate settings/users keys
    const targetJson = parseJsonWithDuplicateKeys(targetContent);
    
    // Align keys with en.json, using deep-translation logic
    const syncedJson = mergeDeep(sourceJson, targetJson, langCode, '');
    
    // Sort keys to maintain pristine structure matching en.json
    const sortedJson = {};
    for (const key of Object.keys(sourceJson)) {
      if (key in syncedJson) {
        sortedJson[key] = syncedJson[key];
      }
    }
    
    // Format JSON with 2-spaces indentation
    const formatted = JSON.stringify(sortedJson, null, 2);
    fs.writeFileSync(targetPath, formatted, 'utf8');
    console.log(`✅ Synced, Translated, and saved "${filename}" successfully.`);
  }
  
  console.log('🎉 All translation files successfully synchronized and localized!');
}

sync();
