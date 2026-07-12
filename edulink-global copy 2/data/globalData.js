export const WORLD_REGIONS = [
  {
    id: 'africa', name: 'Africa', flag: '🌍', color: '#f59e0b',
    countries: ['Nigeria','South Africa','Kenya','Ghana','Ethiopia','Egypt','Tanzania','Uganda','Rwanda','Senegal','Cameroon','Zimbabwe','Zambia','Morocco','Tunisia','Algeria','Botswana','Namibia','Malawi','Madagascar'],
    hubs: ['Lagos','Nairobi','Cape Town','Cairo','Accra','Addis Ababa','Kigali','Dar es Salaam']
  },
  {
    id: 'asia', name: 'Asia', flag: '🌏', color: '#ef4444',
    countries: ['India','China','Japan','South Korea','Singapore','Indonesia','Philippines','Vietnam','Thailand','Malaysia','Pakistan','Bangladesh','Sri Lanka','Nepal','Taiwan'],
    hubs: ['Mumbai','Singapore','Tokyo','Seoul','Jakarta','Manila','Bangkok','Kuala Lumpur']
  },
  {
    id: 'europe', name: 'Europe', flag: '🏰', color: '#3b82f6',
    countries: ['United Kingdom','Germany','France','Netherlands','Sweden','Spain','Italy','Portugal','Poland','Ukraine','Switzerland','Belgium','Austria','Denmark','Finland','Norway','Ireland','Czech Republic'],
    hubs: ['London','Berlin','Paris','Amsterdam','Stockholm','Dublin','Warsaw','Lisbon']
  },
  {
    id: 'americas', name: 'Americas', flag: '🌎', color: '#10b981',
    countries: ['United States','Canada','Brazil','Mexico','Argentina','Colombia','Chile','Peru','Venezuela','Ecuador','Bolivia','Uruguay','Costa Rica','Panama','Jamaica'],
    hubs: ['New York','Toronto','São Paulo','Mexico City','Buenos Aires','Bogotá','Santiago','Lima']
  },
  {
    id: 'middle-east', name: 'Middle East', flag: '🕌', color: '#8b5cf6',
    countries: ['UAE','Saudi Arabia','Turkey','Israel','Jordan','Lebanon','Qatar','Kuwait','Bahrain','Oman'],
    hubs: ['Dubai','Istanbul','Tel Aviv','Riyadh','Doha','Abu Dhabi','Amman','Beirut']
  },
  {
    id: 'oceania', name: 'Oceania', flag: '🦘', color: '#06b6d4',
    countries: ['Australia','New Zealand','Fiji','Papua New Guinea','Samoa','Tonga'],
    hubs: ['Sydney','Melbourne','Auckland','Brisbane','Perth','Wellington']
  },
]

export const INTERNSHIPS = [
  { id:1, title:'Software Engineering Intern', company:'Flutterwave', location:'Lagos, Nigeria', region:'africa', country:'Nigeria', field:'IT', type:'Full-time', deadline:'2025-08-15', salary:'₦150,000/mo', logo:'🏦', description:"Join Africa's leading fintech building payment infrastructure." },
  { id:2, title:'Data Science Intern', company:'Andela', location:'Nairobi, Kenya', region:'africa', country:'Kenya', field:'IT', type:'Remote', deadline:'2025-07-30', salary:'KES 45,000/mo', logo:'💻', description:'Work with global tech teams on data pipelines.' },
  { id:3, title:'Business Development Intern', company:'MTN Group', location:'Johannesburg, South Africa', region:'africa', country:'South Africa', field:'Business', type:'Full-time', deadline:'2025-09-01', salary:'R12,000/mo', logo:'📡', description:'Support expansion strategy across 20 African markets.' },
  { id:4, title:'Civil Engineering Intern', company:'Julius Berger', location:'Abuja, Nigeria', region:'africa', country:'Nigeria', field:'Engineering', type:'Full-time', deadline:'2025-08-20', salary:'₦120,000/mo', logo:'🏗️', description:'Work on major infrastructure projects across West Africa.' },
  { id:5, title:'UX Design Intern', company:'Interswitch', location:'Lagos, Nigeria', region:'africa', country:'Nigeria', field:'Design', type:'Hybrid', deadline:'2025-07-25', salary:'₦100,000/mo', logo:'🎨', description:'Design digital payment experiences for millions of users.' },
  { id:6, title:'Finance Intern', company:'Equity Bank', location:'Nairobi, Kenya', region:'africa', country:'Kenya', field:'Finance', type:'Full-time', deadline:'2025-08-10', salary:'KES 35,000/mo', logo:'💰', description:'Gain exposure to retail and corporate banking.' },
  { id:7, title:'AI/ML Intern', company:'Tata Consultancy Services', location:'Bangalore, India', region:'asia', country:'India', field:'IT', type:'Full-time', deadline:'2025-08-30', salary:'₹25,000/mo', logo:'🤖', description:'Build machine learning models for enterprise clients.' },
  { id:8, title:'Product Management Intern', company:'Grab', location:'Singapore', region:'asia', country:'Singapore', field:'Business', type:'Full-time', deadline:'2025-09-15', salary:'SGD 1,800/mo', logo:'🚗', description:"Define product strategy for Southeast Asia's super-app." },
  { id:9, title:'Hardware Engineering Intern', company:'Samsung Electronics', location:'Seoul, South Korea', region:'asia', country:'South Korea', field:'Engineering', type:'Full-time', deadline:'2025-08-01', salary:'₩2,500,000/mo', logo:'📱', description:'Contribute to next-gen consumer electronics hardware.' },
  { id:10, title:'Software Intern', company:'Spotify', location:'Stockholm, Sweden', region:'europe', country:'Sweden', field:'IT', type:'Full-time', deadline:'2025-10-01', salary:'€2,400/mo', logo:'🎵', description:'Build features used by 600M+ music listeners worldwide.' },
  { id:11, title:'Engineering Intern', company:'Siemens', location:'Berlin, Germany', region:'europe', country:'Germany', field:'Engineering', type:'Full-time', deadline:'2025-09-30', salary:'€2,000/mo', logo:'⚙️', description:'Work on industrial automation and smart infrastructure.' },
  { id:12, title:'Finance Intern', company:'HSBC', location:'London, UK', region:'europe', country:'United Kingdom', field:'Finance', type:'Full-time', deadline:'2025-11-01', salary:'£2,000/mo', logo:'🏛️', description:'Gain exposure to global banking and financial markets.' },
  { id:13, title:'Software Engineering Intern', company:'Google', location:'New York, USA', region:'americas', country:'United States', field:'IT', type:'Full-time', deadline:'2026-01-15', salary:'$8,000/mo', logo:'🔍', description:'Build products used by billions. Strong impact from day one.' },
  { id:14, title:'Data Analytics Intern', company:'Shopify', location:'Toronto, Canada', region:'americas', country:'Canada', field:'IT', type:'Remote', deadline:'2025-10-30', salary:'CAD 5,500/mo', logo:'🛍️', description:'Analyze commerce data and help merchants grow.' },
  { id:15, title:'Business Analyst Intern', company:'Nubank', location:'São Paulo, Brazil', region:'americas', country:'Brazil', field:'Business', type:'Full-time', deadline:'2025-09-20', salary:'R$4,000/mo', logo:'💳', description:"Drive strategy at Latin America's largest digital bank." },
  { id:16, title:'Tech Intern', company:'Careem', location:'Dubai, UAE', region:'middle-east', country:'UAE', field:'IT', type:'Full-time', deadline:'2025-09-01', salary:'AED 4,500/mo', logo:'🚕', description:'Build ride-sharing and delivery tech for MENA.' },
  { id:17, title:'Engineering Intern', company:'Atlassian', location:'Sydney, Australia', region:'oceania', country:'Australia', field:'IT', type:'Full-time', deadline:'2025-10-15', salary:'AUD 5,000/mo', logo:'🦘', description:'Build collaboration tools used by millions globally.' },
]

export const RESOURCES = [
  { id:1, title:'Engineering Mathematics — Past Papers Pack', subject:'Mathematics', type:'Past Papers', region:'all', downloads:3420, rating:4.8, icon:'📐' },
  { id:2, title:'Introduction to Python Programming', subject:'Computer Science', type:'Tutorial', region:'all', downloads:8900, rating:4.9, icon:'🐍' },
  { id:3, title:'Business Management — Case Studies & Notes', subject:'Business', type:'Notes', region:'all', downloads:2100, rating:4.6, icon:'📊' },
  { id:4, title:'African Studies Resource Collection', subject:'African Studies', type:'Academic Guide', region:'africa', downloads:1200, rating:4.7, icon:'🌍' },
  { id:5, title:'Machine Learning Fundamentals', subject:'AI / ML', type:'Tutorial', region:'all', downloads:12400, rating:4.9, icon:'🤖' },
  { id:6, title:'Civil Engineering Structural Analysis', subject:'Civil Engineering', type:'Study Notes', region:'all', downloads:1890, rating:4.5, icon:'🏗️' },
  { id:7, title:'UK Medical School Past Paper Collection', subject:'Medicine', type:'Past Papers', region:'europe', downloads:3600, rating:4.8, icon:'🏥' },
  { id:8, title:'Finance & Banking Study Pack', subject:'Finance', type:'Notes', region:'all', downloads:4500, rating:4.7, icon:'💰' },
  { id:9, title:'Web Development — HTML/CSS/JS Complete Guide', subject:'Web Dev', type:'Tutorial', region:'all', downloads:15800, rating:5.0, icon:'🌐' },
]

export const FIELDS = ['All Fields','IT','Engineering','Business','Finance','Design','Medicine','Law','Education']