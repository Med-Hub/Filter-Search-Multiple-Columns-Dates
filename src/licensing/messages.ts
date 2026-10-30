// Feature-banner tooltip translations. Browser/report locale is supplied by host.locale.
// Fallback is English; none is a custom checkout or a whole-visual paywall.
import { DateLicenceState } from '../core/dateLicence';
type Messages = Record<Exclude<DateLicenceState, 'licensed'>, string>;
const EN: Messages = {
    unlicensed: 'Date filtering requires an assigned Date Filter Pro licence. Text and numeric search remain free.',
    pending: 'Checking your date-filter licence. Your search has not changed; try the date action again shortly.',
    unavailable: 'The date-filter licence could not be verified. Sign in to Power BI and reopen the report. Free search and clearing still work.',
    unsupported: 'Microsoft licence verification is unavailable in this environment. Date filtering is unavailable; free search and clearing still work.',
    unconfigured: 'Test build: the publisher has not configured the Date Filter Pro Service ID yet. Text and numeric search remain free.',
};
const NL: Messages = {
    unlicensed: 'Datumfiltering vereist een toegewezen Date Filter Pro-licentie. Zoeken in tekst en getallen blijft gratis.',
    pending: 'De licentie voor datumfiltering wordt gecontroleerd. Je zoekopdracht is niet gewijzigd. Probeer het zo opnieuw.',
    unavailable: 'De licentie voor datumfiltering kon niet worden gecontroleerd. Meld je aan bij Power BI en open het rapport opnieuw. Gratis zoeken en wissen blijven werken.',
    unsupported: 'Microsoft-licentiecontrole is niet beschikbaar in deze omgeving. Datumfiltering is niet beschikbaar; gratis zoeken en wissen blijven werken.',
    unconfigured: 'Testversie: de uitgever heeft de Service ID voor Date Filter Pro nog niet ingesteld. Zoeken in tekst en getallen blijft gratis.',
};
const FR: Messages = {
    unlicensed: 'Le filtrage des dates nécessite une licence Date Filter Pro attribuée. La recherche de texte et de nombres reste gratuite.',
    pending: 'Vérification de votre licence de filtrage des dates. La recherche est inchangée ; réessayez dans un instant.',
    unavailable: 'Impossible de vérifier la licence de filtrage des dates. Connectez-vous à Power BI et rouvrez le rapport. La recherche gratuite et la suppression des filtres restent disponibles.',
    unsupported: 'La vérification des licences Microsoft est indisponible dans cet environnement. Le filtrage des dates est indisponible ; la recherche gratuite et la suppression des filtres restent disponibles.',
    unconfigured: 'Version de test : le Service ID Date Filter Pro n’a pas encore été configuré par l’éditeur. La recherche de texte et de nombres reste gratuite.',
};
const AR: Messages = {
    unlicensed: 'تصفية التواريخ تتطلب ترخيص Date Filter Pro مخصصًا لك. يبقى البحث في النصوص والأرقام مجانيًا.',
    pending: 'جارٍ التحقق من ترخيص تصفية التواريخ. لم يتغير بحثك؛ حاول مجددًا بعد قليل.',
    unavailable: 'تعذر التحقق من ترخيص تصفية التواريخ. سجل الدخول إلى Power BI ثم أعد فتح التقرير. يظل البحث المجاني ومسح عوامل التصفية متاحين.',
    unsupported: 'التحقق من تراخيص Microsoft غير متاح في هذه البيئة. تصفية التواريخ غير متاحة؛ يظل البحث المجاني ومسح عوامل التصفية متاحين.',
    unconfigured: 'نسخة تجريبية: لم يضبط الناشر معرّف الخدمة الخاص بـ Date Filter Pro بعد. يبقى البحث في النصوص والأرقام مجانيًا.',
};
export function licenceMessage(state: DateLicenceState, locale: string): string {
    if (state === 'licensed') return '';
    const lang = (locale || 'en').toLowerCase().split(/[-_]/)[0];
    return ({ nl: NL, fr: FR, ar: AR }[lang] || EN)[state];
}
