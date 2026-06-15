import 'dotenv/config'
import bcrypt from 'bcryptjs'
import db, { User, Exam, Internship, College, Programme, Module, Topic } from '../models/index.js'

async function seed() {
  try {
    console.log('Connecting...')
    await db.authenticate()
    await db.sync({ alter: true })
    console.log('Tables synced!')

    const hash = await bcrypt.hash('password123', 12)
    const [user] = await User.findOrCreate({
      where: { email: 'demo@udsm.ac.tz' },
      defaults: { firstName:'Demo', lastName:'Student', email:'demo@udsm.ac.tz', password:hash, university:'udsm', faculty:'engineering', yearOfStudy:3, isAdmin:true, bio:'Demo admin.' },
    })
    await user.update({ isAdmin: true })
    console.log('Demo user: demo@udsm.ac.tz / password123')

    await seedHierarchy()

    const exams = [
      { courseName:'Engineering Mathematics II', courseCode:'EMA201', university:'udsm',   faculty:'engineering', year:2023, examType:'UE' },
      { courseName:'Introduction to Programming',courseCode:'CS101',  university:'udsm',   faculty:'science',     year:2023, examType:'UE' },
      { courseName:'Database Systems',           courseCode:'CS301',  university:'udsm',   faculty:'science',     year:2023 },
      { courseName:'Constitutional Law',         courseCode:'LAW301', university:'udsm',   faculty:'law',         year:2023 },
      { courseName:'Business Law',               courseCode:'BL201',  university:'mzumbe', faculty:'business',    year:2022 },
      { courseName:'Financial Accounting',       courseCode:'ACC201', university:'ifm',    faculty:'business',    year:2023 },
      { courseName:'Anatomy and Physiology I',   courseCode:'ANA101', university:'muhas',  faculty:'medicine',    year:2023 },
      { courseName:'Structural Analysis',        courseCode:'CEG301', university:'ardhi',  faculty:'engineering', year:2022 },
      { courseName:'Development Economics',      courseCode:'ECO301', university:'udom',   faculty:'economics',   year:2023 },
      { courseName:'Computer Networks',          courseCode:'NET201', university:'udom',   faculty:'science',     year:2022 },
    ]
    let ec = 0
    for (const e of exams) {
      const [,c] = await Exam.findOrCreate({ where:{ courseCode:e.courseCode, university:e.university, year:e.year }, defaults:{ ...e, fileUrl:'/uploads/exams/placeholder.pdf', fileSize:0, downloadCount:Math.floor(Math.random()*120), uploadedById:user.id } })
      if (c) ec++
    }
    console.log(ec + ' exams created')

    const jobs = [
      { title:'Software Engineering Intern', company:'CRDB Bank', location:'Dar es Salaam', description:'Work on mobile banking APIs. Mentorship provided.', requirements:'CS or IT student. JavaScript/Python preferred.', industry:'banking', type:'internship', isPaid:true, salary:'TZS 300,000/month', contactEmail:'careers@crdbbank.co.tz' },
      { title:'Data Analysis Intern', company:'Tanzania Revenue Authority', location:'Dar es Salaam', description:'Analytics team — revenue dashboards and forecasting.', requirements:'Statistics, Economics or CS background.', industry:'government', type:'internship', isPaid:false },
      { title:'Graduate Trainee — Finance', company:'NMB Bank', location:'Multiple locations', description:'12-month programme: retail banking and credit analysis.', requirements:'Finance or Accounting degree. Min GPA 3.5.', industry:'banking', type:'graduate', isPaid:true, salary:'TZS 800,000/month' },
      { title:'Civil Engineering Intern', company:'TANROADS', location:'Dodoma', description:'Support road construction projects across Tanzania.', requirements:'Civil Engineering student, Year 3 or 4.', industry:'infrastructure', type:'internship', isPaid:true, salary:'TZS 250,000/month' },
      { title:'Marketing Intern', company:'Vodacom Tanzania', location:'Dar es Salaam', description:'Support campaigns, social media and market research.', requirements:'Marketing, Communications or Business student.', industry:'telecommunications', type:'internship', isPaid:true, salary:'TZS 350,000/month' },
    ]
    let jc = 0
    for (const j of jobs) {
      const [,c] = await Internship.findOrCreate({ where:{ title:j.title, company:j.company }, defaults:j })
      if (c) jc++
    }
    console.log(jc + ' internships created')
    console.log('\n✅ Seed complete!')
    process.exit(0)
  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exit(1)
  }
}

async function seedHierarchy() {
  console.log('Seeding academic hierarchy...')
  const H = [
    { name:'College of Engineering and Technology', short:'CoET', uni:'udsm', icon:'⚙️', progs:[
      { name:'BSc Computer Engineering', code:'BSc CE', dur:4, level:'bachelor', mods:[
        { y:1,s:'1',name:'Introduction to Computing',     code:'ITC101',cr:3,core:true, t:['History & evolution of computers','Hardware components overview','Operating system concepts','Binary & number systems','Data representation'] },
        { y:1,s:'1',name:'Engineering Mathematics I',     code:'EMA101',cr:4,core:true, t:['Algebra & functions','Trigonometry','Matrices & determinants','Complex numbers','Differential calculus'] },
        { y:1,s:'2',name:'Programming Fundamentals',      code:'PRG101',cr:3,core:true, t:['Variables & data types','Control flow & loops','Functions & recursion','Arrays & strings','Introduction to OOP'] },
        { y:1,s:'2',name:'Digital Logic Design',          code:'DLD101',cr:3,core:true, t:['Boolean algebra','Logic gates','Combinational circuits','Sequential circuits','Flip-flops & registers'] },
        { y:2,s:'1',name:'Data Structures & Algorithms',  code:'DSA201',cr:4,core:true, t:['Arrays & linked lists','Stacks & queues','Trees & graphs','Sorting algorithms','Complexity analysis'] },
        { y:2,s:'1',name:'Computer Organisation',         code:'COA201',cr:3,core:true, t:['CPU architecture','Memory hierarchy','Instruction sets','Pipelining','Cache memory'] },
        { y:2,s:'2',name:'Object-Oriented Programming',   code:'OOP201',cr:3,core:true, t:['Classes & objects','Inheritance & polymorphism','Encapsulation','Abstract classes & interfaces','Design patterns'] },
        { y:2,s:'2',name:'Database Systems',              code:'DBS201',cr:3,core:true, t:['Relational model','SQL fundamentals','Normalisation','Transactions & ACID','Indexing & query optimisation'] },
        { y:3,s:'1',name:'Operating Systems',             code:'OSY301',cr:3,core:true, t:['Process management','Memory management','File systems','Deadlocks','Linux internals'] },
        { y:3,s:'1',name:'Computer Networks',             code:'CNT301',cr:3,core:true, t:['OSI & TCP/IP models','IP addressing & subnetting','Routing protocols','Network security','Wireless networks'] },
        { y:3,s:'2',name:'Software Engineering',          code:'SEN301',cr:4,core:true, t:['SDLC & Agile','Requirements engineering','UML modelling','Testing strategies','DevOps & CI/CD'] },
        { y:3,s:'2',name:'Embedded Systems',              code:'EMB301',cr:3,core:false,t:['Microcontrollers','GPIO & interrupts','Real-time OS','Sensors & actuators','IoT fundamentals'] },
        { y:4,s:'1',name:'Artificial Intelligence',       code:'AIN401',cr:3,core:true, t:['Search algorithms','Machine learning basics','Neural networks','NLP intro','AI ethics & bias'] },
        { y:4,s:'1',name:'Cloud Computing',               code:'CLD401',cr:3,core:false,t:['Virtualisation','AWS & Azure intro','Docker & Kubernetes','Microservices','Serverless architecture'] },
        { y:4,s:'2',name:'Final Year Project',            code:'FYP402',cr:6,core:true, t:['Project proposal','Literature review','System design','Implementation','Presentation & defence'] },
      ]},
      { name:'BSc Civil Engineering', code:'BSc CivE', dur:4, level:'bachelor', mods:[
        { y:1,s:'1',name:'Engineering Mathematics I',     code:'EMA101',cr:4,core:true, t:['Algebra & functions','Trigonometry','Matrices','Differential calculus','Integral calculus'] },
        { y:1,s:'2',name:'Engineering Drawing & CAD',     code:'EDR101',cr:3,core:true, t:['Orthographic projection','Isometric views','AutoCAD fundamentals','Technical sketching','Drawing standards'] },
        { y:2,s:'1',name:'Structural Analysis I',         code:'STA201',cr:4,core:true, t:['Static equilibrium','Beam analysis','Truss analysis','Influence lines','Deflection calculations'] },
        { y:2,s:'2',name:'Fluid Mechanics',               code:'FLM202',cr:4,core:true, t:['Fluid statics','Continuity equation','Bernoulli theorem','Pipe flow','Open channel flow'] },
        { y:3,s:'1',name:'Structural Analysis II',        code:'STA301',cr:4,core:true, t:['Matrix stiffness method','Slope-deflection method','Moment distribution','Plastic analysis','Finite element intro'] },
        { y:3,s:'2',name:'Geotechnical Engineering',      code:'GEO301',cr:4,core:true, t:['Soil classification','Compaction testing','Consolidation','Shear strength','Foundation design'] },
        { y:4,s:'1',name:'Construction Management',       code:'CMG401',cr:3,core:true, t:['Project planning & scheduling','CPM & PERT','Cost estimation','Contract administration','Health & safety'] },
      ]},
    ]},
    { name:'College of ICT', short:'CoICT', uni:'udsm', icon:'💻', progs:[
      { name:'BSc Computer Science', code:'BSc CS', dur:3, level:'bachelor', mods:[
        { y:1,s:'1',name:'Introduction to Programming',   code:'CS101', cr:3,core:true, t:['Python basics','Variables & data types','Control structures','Functions','File I/O'] },
        { y:1,s:'2',name:'Discrete Mathematics',          code:'DMA102',cr:3,core:true, t:['Set theory','Mathematical logic','Relations & functions','Graph theory','Combinatorics'] },
        { y:2,s:'1',name:'Data Structures & Algorithms',  code:'CS201', cr:4,core:true, t:['Lists & trees','Heaps','Sorting & searching','Complexity analysis','Dynamic programming'] },
        { y:2,s:'2',name:'Database Management',           code:'CS301', cr:3,core:true, t:['ER modelling','Advanced SQL','Stored procedures','NoSQL intro','Database security'] },
        { y:2,s:'2',name:'Web Technologies',              code:'WEB201',cr:3,core:true, t:['HTML5 & CSS3','JavaScript ES6+','React fundamentals','REST APIs','Web security basics'] },
        { y:3,s:'1',name:'Machine Learning',              code:'ML301', cr:3,core:false,t:['Supervised learning','Unsupervised learning','Neural networks','Model evaluation','Scikit-learn & TensorFlow'] },
        { y:3,s:'2',name:'Information Security',          code:'SEC302',cr:3,core:true, t:['Cryptography','Network security','Ethical hacking','Security auditing','Incident response'] },
      ]},
      { name:'BSc Information Technology', code:'BSc IT', dur:3, level:'bachelor', mods:[
        { y:1,s:'1',name:'Fundamentals of IT',            code:'IT101', cr:3,core:true, t:['IT history','Hardware & software','Networking basics','Internet fundamentals','Cybersecurity intro'] },
        { y:1,s:'2',name:'Business Information Systems',  code:'BIS102',cr:3,core:true, t:['IS types & roles','ERP systems','Data management','Business processes','IT governance'] },
        { y:2,s:'1',name:'Systems Analysis & Design',     code:'SAD201',cr:3,core:true, t:['SDLC phases','Requirements gathering','Use case diagrams','DFDs','Prototyping methods'] },
        { y:2,s:'2',name:'Network Administration',        code:'NET202',cr:3,core:true, t:['TCP/IP configuration','DHCP & DNS','VLANs & switching','Firewalls','Network monitoring'] },
        { y:3,s:'1',name:'IT Project Management',         code:'IPM301',cr:3,core:true, t:['Agile & Scrum','Risk management','Stakeholder management','Gantt charts','PMP framework'] },
      ]},
    ]},
    { name:'School of Law', short:'SoL', uni:'udsm', icon:'⚖️', progs:[
      { name:'Bachelor of Laws', code:'LLB', dur:3, level:'bachelor', mods:[
        { y:1,s:'1',name:'Introduction to Law',           code:'LAW101',cr:3,core:true, t:['Nature & purpose of law','Sources of law','Legal systems of Tanzania','Court hierarchy','Legal reasoning'] },
        { y:1,s:'2',name:'Law of Contract',               code:'LAW102',cr:4,core:true, t:['Offer & acceptance','Consideration','Contractual capacity','Vitiating factors','Remedies for breach'] },
        { y:2,s:'1',name:'Law of Tort',                   code:'LAW201',cr:3,core:true, t:['Negligence','Occupiers liability','Private nuisance','Defamation','Product liability'] },
        { y:2,s:'2',name:'Constitutional Law',            code:'LAW301',cr:4,core:true, t:['Constitutional supremacy','Separation of powers','Bill of rights','Judicial review','Tanzania constitution 1977'] },
        { y:3,s:'1',name:'Criminal Law',                  code:'LAW302',cr:4,core:true, t:['Elements of crime','Homicide','Theft & fraud','Defences','Sentencing & penalties'] },
        { y:3,s:'2',name:'Commercial Law',                code:'LAW401',cr:3,core:true, t:['Company law','Partnership','Sale of goods','Negotiable instruments','Intellectual property'] },
      ]},
    ]},
    { name:'Faculty of Accountancy', short:'FoA', uni:'ifm', icon:'📊', progs:[
      { name:'Bachelor of Accountancy', code:'BAcc', dur:3, level:'bachelor', mods:[
        { y:1,s:'1',name:'Financial Accounting I',        code:'FAC101',cr:4,core:true, t:['Accounting equation','Journal entries','Ledger posting','Trial balance','Sole trader accounts'] },
        { y:1,s:'2',name:'Financial Accounting II',       code:'FAC102',cr:4,core:true, t:['Partnership accounts','Company accounts','Cash flow statements','IFRS fundamentals','Ratio analysis'] },
        { y:2,s:'1',name:'Management Accounting',         code:'MAC201',cr:3,core:true, t:['Cost classification','Job costing','Process costing','Budgeting techniques','Variance analysis'] },
        { y:2,s:'2',name:'Financial Management',          code:'FMG202',cr:4,core:true, t:['Time value of money','Capital budgeting techniques','Working capital management','Financing decisions','Dividend policy'] },
        { y:3,s:'1',name:'Auditing & Assurance',          code:'AUD301',cr:4,core:true, t:['Audit principles','Internal controls','Audit evidence','Going concern','Audit report writing'] },
        { y:3,s:'2',name:'Taxation',                      code:'TAX302',cr:3,core:true, t:['Income tax','Corporate tax','VAT & customs','Tax planning strategies','Tanzania tax legislation'] },
      ]},
    ]},
    { name:'Faculty of Business Management', short:'FoBM', uni:'mzumbe', icon:'🏢', progs:[
      { name:'Bachelor of Business Administration', code:'BBA', dur:3, level:'bachelor', mods:[
        { y:1,s:'1',name:'Principles of Management',      code:'MGT101',cr:3,core:true, t:['Management functions','Organisational structures','Leadership styles','Motivation theories','Managerial communication'] },
        { y:1,s:'2',name:'Business Law',                  code:'BLW102',cr:3,core:true, t:['Contract law basics','Business entities','Employment law','IP rights','Dispute resolution'] },
        { y:2,s:'1',name:'Human Resource Management',     code:'HRM201',cr:3,core:true, t:['Recruitment & selection','Training & development','Performance management','Compensation & benefits','Labour relations'] },
        { y:2,s:'2',name:'Marketing Management',          code:'MKT202',cr:3,core:true, t:['Marketing mix (4Ps)','Consumer behaviour','Market research','Branding','Digital marketing'] },
        { y:3,s:'1',name:'Strategic Management',          code:'STR301',cr:4,core:true, t:['SWOT & PESTLE analysis','Porter\'s five forces','Competitive strategy','Strategy implementation','Corporate governance'] },
        { y:3,s:'2',name:'Operations Management',         code:'OPM302',cr:3,core:true, t:['Production planning','Quality management (TQM)','Supply chain management','Lean & Six Sigma','Project management tools'] },
      ]},
    ]},
    { name:'School of Medicine', short:'SoM', uni:'muhas', icon:'🏥', progs:[
      { name:'Doctor of Medicine', code:'MBChB', dur:5, level:'bachelor', mods:[
        { y:1,s:'1',name:'Human Anatomy I',               code:'ANA101',cr:5,core:true, t:['Upper limb anatomy','Lower limb anatomy','Thorax & abdomen','Histology fundamentals','Embryology basics'] },
        { y:1,s:'2',name:'Physiology I',                  code:'PHY102',cr:5,core:true, t:['Cell physiology','Blood & haematopoiesis','Cardiovascular physiology','Respiratory physiology','Renal physiology'] },
        { y:2,s:'1',name:'Biochemistry',                  code:'BCH201',cr:4,core:true, t:['Carbohydrate metabolism','Lipid metabolism','Protein synthesis & degradation','Enzymology','Molecular biology basics'] },
        { y:2,s:'2',name:'Pharmacology I',                code:'PHA202',cr:4,core:true, t:['Pharmacokinetics','Pharmacodynamics','Autonomic drugs','Analgesics & NSAIDs','Antimicrobial agents'] },
        { y:3,s:'1',name:'Pathology',                     code:'PAT301',cr:5,core:true, t:['Cell injury & death','Inflammation & repair','Neoplasia','Haematological disorders','Cardiovascular pathology'] },
        { y:3,s:'2',name:'Clinical Medicine I',           code:'CLM302',cr:5,core:true, t:['Clinical history taking','Physical examination','ECG interpretation','Chest X-ray reading','Common clinical presentations'] },
      ]},
    ]},
  ]

  let cc=0,pc=0,mc=0,tc=0
  for (const cd of H) {
    const [col] = await College.findOrCreate({ where:{ name:cd.name, university:cd.uni }, defaults:{ name:cd.name, shortName:cd.short, university:cd.uni, icon:cd.icon } })
    cc++
    for (const pd of cd.progs) {
      const [prog] = await Programme.findOrCreate({ where:{ name:pd.name, collegeId:col.id }, defaults:{ name:pd.name, code:pd.code, collegeId:col.id, duration:pd.dur, degreeLevel:pd.level } })
      pc++
      for (const md of pd.mods) {
        const [mod,newMod] = await Module.findOrCreate({ where:{ code:md.code, programmeId:prog.id }, defaults:{ name:md.name, code:md.code, programmeId:prog.id, yearOfStudy:md.y, semester:md.s, credits:md.cr, isCore:md.core } })
        if(newMod) mc++
        for (let i=0;i<md.t.length;i++) {
          const [,newT] = await Topic.findOrCreate({ where:{ name:md.t[i], moduleId:mod.id }, defaults:{ name:md.t[i], moduleId:mod.id, orderIndex:i } })
          if(newT) tc++
        }
      }
    }
  }
  console.log(`Hierarchy: ${cc} colleges, ${pc} programmes, ${mc} modules, ${tc} topics`)
}

seed()
