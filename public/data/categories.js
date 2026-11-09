export const categories = [
  { id: 'farmers', en: 'Agriculture and farmers', te: 'వ్యవసాయం, రైతులు', icon: 'leaf', terms: ['farmer', 'farmers', 'farming', 'agriculture', 'cultivation', 'crop', 'rythu', 'రైతు', 'రైతుల', 'రైతులకు', 'రైతులు', 'వ్యవసాయం', 'పంట', 'పంటలు'] },
  { id: 'education', en: 'Education and scholarships', te: 'విద్య, ఉపకార వేతనాలు', icon: 'education', terms: ['student', 'students', 'school', 'scholarship', 'scholarships', 'education', 'college', 'విద్యార్థి', 'విద్యార్థులకు', 'విద్యార్థుల', 'విద్యార్థులు', 'చదువు', 'విద్య', 'స్కాలర్‌షిప్', 'ఉపకార వేతనం'] },
  { id: 'health', en: 'Health and medical', te: 'ఆరోగ్యం, వైద్యం', icon: 'health', terms: ['health', 'hospital', 'medical', 'treatment', 'pregnant', 'pregnancy', 'ఆరోగ్యం', 'ఆసుపత్రి', 'వైద్యం', 'చికిత్స', 'గర్భిణీ', 'గర్భిణులకు'] },
  { id: 'women', en: 'Women and child welfare', te: 'మహిళా, శిశు సంక్షేమం', icon: 'heart', terms: ['women', 'woman', 'girls', 'girl child', 'child welfare', 'lpg', 'మహిళ', 'మహిళలు', 'మహిళలకు', 'మహిళల', 'బాలిక', 'ఆడపిల్ల', 'శిశు', 'గ్యాస్'] },
  { id: 'housing', en: 'Housing and basic needs', te: 'గృహ నిర్మాణం, ప్రాథమిక అవసరాలు', icon: 'home', terms: ['housing', 'house', 'home loan', 'shelter', 'tap water', 'water connection', 'ఇల్లు', 'ఇంటి', 'ఇళ్ల', 'ఇళ్ళు', 'గృహ', 'తాగునీరు', 'కుళాయి'] },
  { id: 'employment', en: 'Employment', te: 'ఉపాధి', icon: 'work', terms: ['employment', 'job', 'jobs', 'work', 'job card', 'ఉపాధి', 'ఉద్యోగం', 'ఉద్యోగాలు', 'పని', 'జాబ్ కార్డు'] },
  { id: 'business', en: 'Business and entrepreneurship', te: 'వ్యాపారం, స్వయం ఉపాధి', icon: 'work', terms: ['business', 'entrepreneur', 'street vendor', 'micro enterprise', 'self employment', 'వ్యాపారం', 'వ్యాపార', 'చిరువ్యాపారులు', 'స్వయం ఉపాధి'] },
  { id: 'pension', en: 'Pension and senior citizens', te: 'పింఛన్లు, వృద్ధులు', icon: 'heart', terms: ['pension', 'pensions', 'senior citizen', 'elderly', 'old age', 'పింఛన్', 'పింఛను', 'పింఛన్లు', 'పెన్షన్', 'వృద్ధులు', 'వృద్ధులకు'] },
  { id: 'finance', en: 'Financial assistance', te: 'ఆర్థిక సహాయం', icon: 'wallet', terms: ['financial assistance', 'financial support', 'money', 'subsidy', 'loan', 'ఆర్థిక సహాయం', 'రుణం', 'సబ్సిడీ', 'డబ్బు'] },
  { id: 'skills', en: 'Skill development', te: 'నైపుణ్యాభివృద్ధి', icon: 'skill', terms: ['skill', 'skills', 'training', 'course', 'vocational', 'నైపుణ్యం', 'నైపుణ్య', 'శిక్షణ', 'కోర్సు'] },
];

export const categoryById = Object.fromEntries(categories.map(category => [category.id, category]));
export const stateTerms = ['andhra pradesh', 'andhra', 'in ap', 'ap state', 'ap', 'ఆంధ్రప్రదేశ్', 'ఆంధ్ర ప్రదేశ్', 'ఏపీ'];
