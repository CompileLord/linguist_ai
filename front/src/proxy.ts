import i18nProxy from './i18n/proxy';
 
export default i18nProxy;
 
export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ru|tg|en)/:path*']
};
