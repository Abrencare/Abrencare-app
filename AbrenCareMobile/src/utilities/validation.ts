/**
 * Accepts common email formats across providers (Gmail, Yahoo, Outlook,
 * company domains, plus-addressing, multi-part TLDs like .co.uk).
 */
export function isValidEmail(value: string) {
  const email = value.trim();
  if (!email || email.length > 254) {
    return false;
  }
  if (/\s/.test(email) || email.includes('..')) {
    return false;
  }

  const at = email.lastIndexOf('@');
  if (at <= 0 || at === email.length - 1) {
    return false;
  }

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  if (!local || local.length > 64) {
    return false;
  }
  if (local.startsWith('.') || local.endsWith('.')) {
    return false;
  }
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) {
    return false;
  }

  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return false;
  }
  if (domain.includes('..')) {
    return false;
  }

  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }

  const tld = labels[labels.length - 1];
  if (!/^[A-Za-z]{2,24}$/.test(tld)) {
    return false;
  }

  return labels.every((label) =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label),
  );
}
