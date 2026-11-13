import {
  acceptExecutiveProposal,
  loadExecutiveInquiry,
  loadExecutiveInquiryById,
  markExecutiveContacted,
  shareExecutiveProposal,
  type ExecutiveInquiry,
  type ExecutiveProposal,
} from '@/data/executiveInquiry';
import {
  acceptFamilyProposal,
  loadFamilyInquiry,
  loadFamilyInquiryById,
  markFamilyContacted,
  shareFamilyProposal,
  type FamilyInquiry,
  type FamilyProposal,
} from '@/data/familyInquiry';

function familyProposal(name: string): Omit<FamilyProposal, 'sharedAt'> {
  return {
    recipient: name,
    services: 'Home visits, health checks, follow-up and visit reports',
    visitFrequency: '1 nurse visit per week',
    planDuration: '3 months',
    quoteAmount: '12,500',
    quoteCurrency: 'ETB',
    billingPeriod: 'Billed monthly in advance',
    exclusions:
      'Lab tests, specialist fees, extra visits outside the weekly schedule, and emergency transport are not included.',
    paymentTerms:
      'Pay the monthly fee before each billing period starts. Receipts are shared with the account holder.',
    cancellationTerms:
      'Cancel with 14 days notice. Visits already completed remain payable. Accepting this plan does not start visits until registration is complete.',
  };
}

function executiveProposal(name: string): Omit<ExecutiveProposal, 'sharedAt'> {
  return {
    recipient: name,
    services: 'Home or office check-ins, physician review and health follow-up',
    visitFrequency: '2 physician-led visits per month',
    planDuration: '3 months',
    quoteAmount: '28,500',
    quoteCurrency: 'ETB',
    billingPeriod: 'Billed monthly in advance',
    exclusions:
      'Lab tests, specialist referrals, hospital admissions, and travel outside Addis Ababa are not included.',
    paymentTerms:
      'Pay the monthly fee before each billing period starts. Receipts are shared with the account holder.',
    cancellationTerms:
      'Cancel with 14 days notice. Visits already completed remain payable. Accepting this plan does not start visits until registration is complete.',
  };
}

/** Team prepares a private plan. The customer still has to approve it. */
export async function prepareFamilyPlan(id: string): Promise<FamilyInquiry | null> {
  let item = await loadFamilyInquiryById(id);
  if (!item) {
    return null;
  }
  if (item.status === 'received') {
    await markFamilyContacted(id);
    item = (await loadFamilyInquiryById(id)) ?? item;
  }
  if (
    item.status === 'contacted' ||
    (item.status === 'proposed' && !item.proposal?.quoteAmount?.trim())
  ) {
    await shareFamilyProposal(
      id,
      familyProposal(item.patientName || item.name),
    );
    item = (await loadFamilyInquiryById(id)) ?? item;
  }
  return item;
}

export async function prepareExecutivePlan(id: string): Promise<ExecutiveInquiry | null> {
  let item = await loadExecutiveInquiryById(id);
  if (!item) {
    return null;
  }
  if (item.status === 'received') {
    await markExecutiveContacted(id);
    item = (await loadExecutiveInquiryById(id)) ?? item;
  }
  if (
    item.status === 'contacted' ||
    (item.status === 'proposed' && !item.proposal?.quoteAmount?.trim())
  ) {
    await shareExecutiveProposal(id, executiveProposal(item.name));
    item = (await loadExecutiveInquiryById(id)) ?? item;
  }
  return item;
}

export async function prepareLatestPlan(service: 'family' | 'executive') {
  if (service === 'family') {
    const inquiry = await loadFamilyInquiry();
    return inquiry ? prepareFamilyPlan(inquiry.id) : null;
  }
  const inquiry = await loadExecutiveInquiry();
  return inquiry ? prepareExecutivePlan(inquiry.id) : null;
}

/** Marks contacted, shares a private plan, and accepts it. Does not activate care. */
export async function demoApproveFamilyInquiry(id: string): Promise<FamilyInquiry | null> {
  let item = await loadFamilyInquiryById(id);
  if (!item) {
    return null;
  }
  if (item.status === 'received') {
    await markFamilyContacted(id);
    item = (await loadFamilyInquiryById(id)) ?? item;
  }
  if (item.status === 'contacted' || item.status === 'proposed') {
    await shareFamilyProposal(id, familyProposal(item.patientName || item.name));
    item = (await loadFamilyInquiryById(id)) ?? item;
  }
  if (item.status === 'proposed') {
    await acceptFamilyProposal(id);
    item = (await loadFamilyInquiryById(id)) ?? item;
  }
  return item;
}

export async function demoApproveExecutiveInquiry(id: string): Promise<ExecutiveInquiry | null> {
  let item = await loadExecutiveInquiryById(id);
  if (!item) {
    return null;
  }
  if (item.status === 'received') {
    await markExecutiveContacted(id);
    item = (await loadExecutiveInquiryById(id)) ?? item;
  }
  if (item.status === 'contacted' || item.status === 'proposed') {
    await shareExecutiveProposal(id, executiveProposal(item.name));
    item = (await loadExecutiveInquiryById(id)) ?? item;
  }
  if (item.status === 'proposed') {
    await acceptExecutiveProposal(id);
    item = (await loadExecutiveInquiryById(id)) ?? item;
  }
  return item;
}

export async function latestFamilyInquiry() {
  return loadFamilyInquiry();
}

export async function latestExecutiveInquiry() {
  return loadExecutiveInquiry();
}
