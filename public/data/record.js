const pair = ([en, te]) => ({ en, te });
const section = ([en, te]) => pair([en.split(' | '), te.split(' | ')]);

export function scheme({ id, name, categories, aliases, overview, benefits, eligibility, documents, steps,
  department, information, references = [], access = 'office', application = null, status = 'service', state = false,
  jurisdiction = state ? 'andhra' : 'central' }) {
  return {
    id, name: pair(name), categories, aliases, overview: pair(overview), benefits: section(benefits),
    eligibility: section(eligibility), documents: section(documents), steps: section(steps),
    department: pair(department), jurisdiction,
    location: state ? pair(['Andhra Pradesh', 'ఆంధ్రప్రదేశ్']) : pair(['India, subject to local coverage', 'భారతదేశం · స్థానిక అమలుకు లోబడి']),
    status, verifiedAt: '2026-11-09', information, application, access,
    references: [...new Set([information, ...references, ...(application ? [application] : [])])],
  };
}
