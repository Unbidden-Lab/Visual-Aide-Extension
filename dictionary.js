/**
 * Visual Aide - Simplified Dictionary (High-Speed Offline & Online)
 * Designed for dyslexia & cognitive accessibility: replaces dense dictionary jargon
 * with clear, plain-English definitions and simpler everyday synonyms.
 * Includes automatic stemming, strict 2.5s timeouts, and CORS-safe background proxying.
 */

const SIMPLIFIED_OFFLINE_DB = {
  "aberration": {
    "pos": "noun",
    "def": "Something unusual that is different from what is normal or expected.",
    "context": "In context: Used when an event, measurement, or behavior departs from what is expected or normal.",
    "synonyms": ["oddity","irregularity","exception"],
    "antonyms": ["normality","regularity","conformity","standard"],
    "example": "Snow in July is an aberration in most places."
  },
  "abstain": {
    "pos": "verb",
    "def": "To choose not to do or have something.",
    "context": "In context: Used when intentionally deciding not to vote, consume, or engage in an activity.",
    "synonyms": ["avoid","refrain","hold back"],
    "antonyms": ["indulge","partake","participate","consume"],
    "example": "He decided to abstain from eating sugary snacks."
  },
  "accommodate": {
    "pos": "verb",
    "def": "To make fit, help out, or provide enough space for someone.",
    "context": "In context: Used when adapting conditions or providing resources to meet another person's needs.",
    "synonyms": ["fit","help","suit","adjust"],
    "antonyms": ["hinder","reject","block","disallow"],
    "example": "The hotel can accommodate up to 200 guests."
  },
  "accommodation": {
    "pos": "noun",
    "def": "A helpful adjustment or a place to stay that fits someone's needs.",
    "context": "In context: Refers to assistive tools, learning adjustments, or supportive living spaces.",
    "synonyms": ["adjustment","help","support","lodging"],
    "antonyms": ["barrier","hindrance","restriction"],
    "example": "Extra reading time is a helpful accommodation in school."
  },
  "accumulate": {
    "pos": "verb",
    "def": "To collect or gather more and more over time.",
    "context": "In context: Describes gradual growth or buildup of items, wealth, or evidence over time.",
    "synonyms": ["gather","collect","build up"],
    "antonyms": ["disperse","scatter","dissipate","spend"],
    "example": "Dust will accumulate if you do not clean often."
  },
  "adversity": {
    "pos": "noun",
    "def": "A difficult situation or misfortune that brings hardship.",
    "context": "In context: Used when discussing serious challenges, hardships, or misfortunes in life.",
    "synonyms": ["hardship","trouble","difficulty"],
    "antonyms": ["prosperity","fortune","ease","luck"],
    "example": "She stayed brave and hopeful despite facing great adversity."
  },
  "alleviate": {
    "pos": "verb",
    "def": "To make pain, suffering, or trouble less severe.",
    "context": "In context: Used when reducing the burden or intensity of pain, strain, or difficult problems.",
    "synonyms": ["ease","relieve","lessen","soothe"],
    "antonyms": ["aggravate","worsen","intensify","increase"],
    "example": "A cold drink can alleviate a sore throat."
  },
  "ambiguous": {
    "pos": "adjective",
    "def": "Having more than one possible meaning; not clear.",
    "context": "In context: Describes language, signals, or directions that can be understood in multiple conflicting ways.",
    "synonyms": ["unclear","vague","puzzling"],
    "antonyms": ["clear","explicit","definite","unambiguous"],
    "example": "His directions were ambiguous, so we took the wrong road."
  },
  "anchor": {
    "pos": "verb",
    "def": "To hold firmly in place so something does not drift or move.",
    "context": "In context: Used for holding physical or visual objects in place so they remain stable and readable.",
    "synonyms": ["secure","hold fast","steady"],
    "antonyms": ["uproot","loosen","detach","drift"],
    "example": "Heavy letter bases anchor words so they do not swim."
  },
  "anomaly": {
    "pos": "noun",
    "def": "Something that does not fit the regular rule or pattern.",
    "context": "In context: Describes data points or observations that deviate from established models or rules.",
    "synonyms": ["misfit","oddity","outlier"],
    "antonyms": ["standard","norm","pattern","regularity"],
    "example": "Finding an ice cube in the desert would be an anomaly."
  },
  "apprehensive": {
    "pos": "adjective",
    "def": "Feeling nervous or worried that something bad might happen.",
    "context": "In context: Used when feeling uneasy or anxious about an upcoming uncertain event.",
    "synonyms": ["anxious","worried","nervous"],
    "antonyms": ["confident","calm","assured","composed"],
    "example": "She felt apprehensive before speaking in front of the class."
  },
  "arbitrary": {
    "pos": "adjective",
    "def": "Based on random choice or impulse rather than a fair reason.",
    "context": "In context: Describes decisions made on personal whim rather than established rules or logical systems.",
    "synonyms": ["random","unplanned","chance"],
    "antonyms": ["reasoned","methodical","rational","fair"],
    "example": "Picking the winner by coin flip felt arbitrary."
  },
  "articulate": {
    "pos": "adjective",
    "def": "Able to express thoughts and ideas clearly.",
    "context": "In context: Used for expressing thoughts fluently, clearly, and persuasively in speech or writing.",
    "synonyms": ["clear","well-spoken","fluent"],
    "antonyms": ["incoherent","unclear","muffled","hesitant"],
    "example": "The teacher gave an articulate explanation of the lesson."
  },
  "augment": {
    "pos": "verb",
    "def": "To make something greater or larger by adding to it.",
    "context": "In context: Used when adding something to make an existing system, income, or capability larger or stronger.",
    "synonyms": ["increase","add to","grow"],
    "antonyms": ["diminish","decrease","reduce","lessen"],
    "example": "He took an evening job to augment his income."
  },
  "benevolent": {
    "pos": "adjective",
    "def": "Kind, helpful, and caring towards others.",
    "context": "In context: Describes individuals, organizations, or actions guided by kindness and charity.",
    "synonyms": ["kind","generous","helpful"],
    "antonyms": ["malevolent","cruel","spiteful","unkind"],
    "example": "A benevolent stranger paid for the family's dinner."
  },
  "bionic": {
    "pos": "adjective",
    "def": "Using technology or visual anchors to help human abilities work better.",
    "context": "In context: In reading, refers to typography techniques that bold fixations to accelerate visual comprehension.",
    "synonyms": ["guided","enhanced","assisted"],
    "antonyms": ["natural","biological","unaided","conventional"],
    "example": "Bionic reading guides the eyes across text."
  },
  "bolster": {
    "pos": "verb",
    "def": "To support, strengthen, or hold something up.",
    "context": "In context: Used when giving added physical, structural, or emotional support to sustain something.",
    "synonyms": ["support","boost","strengthen"],
    "antonyms": ["undermine","weaken","weaken","subvert"],
    "example": "Positive feedback helped bolster her confidence."
  },
  "candid": {
    "pos": "adjective",
    "def": "Truthful, direct, and honest.",
    "context": "In context: Refers to honest, straightforward commentary without sugarcoating.",
    "synonyms": ["honest","frank","open"],
    "antonyms": ["secretive","guarded","evasive","dishonest"],
    "example": "The coach gave candid advice on how to improve."
  },
  "chronological": {
    "pos": "adjective",
    "def": "Arranged in the order of time that events happened.",
    "context": "In context: Used when organizing historical timelines, stories, or events in the exact sequence they occurred.",
    "synonyms": ["in order","sequential","timed"],
    "antonyms": ["unordered","random","scrambled","nonlinear"],
    "example": "The history book told the story in chronological order."
  },
  "coerce": {
    "pos": "verb",
    "def": "To force someone into doing something they do not want to do.",
    "context": "In context: Describes forcing someone to do something through threats, intimidation, or pressure.",
    "synonyms": ["force","push","compel"],
    "antonyms": ["persuade","allow","request","encourage"],
    "example": "You should never coerce someone into signing a contract."
  },
  "cognitive": {
    "pos": "adjective",
    "def": "Related to thinking, understanding, learning, and remembering.",
    "context": "In context: Relates to mental brain processes including memory, attention, comprehension, and reasoning.",
    "synonyms": ["mental","thinking","reasoning"],
    "antonyms": ["physical","instinctive","reflexive"],
    "example": "Reading exercises help improve cognitive skills."
  },
  "coherent": {
    "pos": "adjective",
    "def": "Logical, clear, and making good sense.",
    "context": "In context: Describes writing, speech, or plans where every part connects logically and cleanly.",
    "synonyms": ["clear","logical","connected"],
    "antonyms": ["incoherent","disjointed","muddled","confusing"],
    "example": "He wrote a coherent essay that was easy to understand."
  },
  "collaborate": {
    "pos": "verb",
    "def": "To work together with others toward a shared goal.",
    "context": "In context: Used when multiple individuals or groups work together on a shared objective.",
    "synonyms": ["cooperate","team up","work together"],
    "antonyms": ["compete","oppose","work alone","isolate"],
    "example": "The two teams collaborated to finish the project on time."
  },
  "compensate": {
    "pos": "verb",
    "def": "To give money or a reward to make up for loss, damage, or work.",
    "context": "In context: Used when balancing an impairment or deficit, or providing payment for service or injury.",
    "synonyms": ["repay","make up for","pay"],
    "antonyms": ["penalize","deprive","worsen","take"],
    "example": "The company will compensate workers for extra hours."
  },
  "comprehend": {
    "pos": "verb",
    "def": "To understand the meaning of something clearly.",
    "context": "In context: Describes fully grasping the deeper meaning and substance of ideas or reading material.",
    "synonyms": ["understand","grasp","get"],
    "antonyms": ["misunderstand","misinterpret","confuse","miss"],
    "example": "Good spacing helps students comprehend long paragraphs."
  },
  "comprehension": {
    "pos": "noun",
    "def": "The ability to understand and find meaning in what is read or heard.",
    "context": "In context: Refers to the capacity to absorb, analyze, and retain information while reading.",
    "synonyms": ["understanding","grasp","knowledge"],
    "antonyms": ["misunderstanding","incomprehension","confusion"],
    "example": "Visual aids boost reading comprehension."
  },
  "comprehensive": {
    "pos": "adjective",
    "def": "Including all or almost all details; complete.",
    "context": "In context: Describes surveys, guides, or solutions that thoroughly cover every essential detail.",
    "synonyms": ["complete","thorough","full"],
    "antonyms": ["limited","partial","incomplete","selective"],
    "example": "The guide gave a comprehensive list of all town parks."
  },
  "concur": {
    "pos": "verb",
    "def": "To agree with someone or with an opinion.",
    "context": "In context: Formal term used when sharing the same opinion or reaching consensus.",
    "synonyms": ["agree","coincide","concur"],
    "antonyms": ["disagree","dissent","differ","object"],
    "example": "All the doctors concurred that rest was the best treatment."
  },
  "condone": {
    "pos": "verb",
    "def": "To accept or forgive bad behavior as if it were okay.",
    "context": "In context: Used when implicitly permitting or overlooking questionable behavior.",
    "synonyms": ["allow","excuse","accept"],
    "antonyms": ["condemn","forbid","prohibit","punish"],
    "example": "The school does not condone cheating of any kind."
  },
  "conducive": {
    "pos": "adjective",
    "def": "Making it easy or likely for something good to happen.",
    "context": "In context: Describes conditions, spaces, or tools that make a desirable outcome easily achievable.",
    "synonyms": ["helpful","favorable","beneficial"],
    "antonyms": ["unfavorable","hindering","detrimental","hostile"],
    "example": "A quiet room is conducive to studying."
  },
  "conspicuous": {
    "pos": "adjective",
    "def": "Very noticeable or easily seen.",
    "context": "In context: Used when something stands out so vividly that it immediately attracts attention.",
    "synonyms": ["obvious","evident","visible"],
    "antonyms": ["inconspicuous","hidden","unnoticeable","discreet"],
    "example": "The bright yellow jacket was conspicuous in the crowd."
  },
  "contemporary": {
    "pos": "adjective",
    "def": "Belonging to the present time; modern.",
    "context": "In context: Relates to current modern times or occurring simultaneously with other events.",
    "synonyms": ["modern","current","present-day"],
    "antonyms": ["archaic","historical","ancient","antiquated"],
    "example": "She loves contemporary art and modern designs."
  },
  "corroborate": {
    "pos": "verb",
    "def": "To give evidence that confirms or supports a statement.",
    "context": "In context: Used in research and evidence when external data confirms or backs up a statement.",
    "synonyms": ["confirm","verify","back up"],
    "antonyms": ["contradict","refute","disprove","undermine"],
    "example": "Security video corroborated the witness's story."
  },
  "cumbersome": {
    "pos": "adjective",
    "def": "Large, heavy, and awkward to carry or manage.",
    "context": "In context: Describes procedures, bulky objects, or sentences that are awkward to navigate.",
    "synonyms": ["clunky","awkward","heavy"],
    "antonyms": ["manageable","convenient","lightweight","streamlined"],
    "example": "The heavy backpack was cumbersome on the long hike."
  },
  "debilitate": {
    "pos": "verb",
    "def": "To make someone very weak or feeble.",
    "context": "In context: Used when illness, stress, or sensory fatigue weakens functional ability.",
    "synonyms": ["weaken","drain","exhaust"],
    "antonyms": ["strengthen","invigorate","energize","fortify"],
    "example": "A high fever can quickly debilitate even strong athletes."
  },
  "deduce": {
    "pos": "verb",
    "def": "To reach a logical conclusion from known facts.",
    "context": "In context: Used in logic when drawing a reliable conclusion based on facts and clues.",
    "synonyms": ["figure out","infer","work out"],
    "antonyms": ["guess","assume","conjecture"],
    "example": "From the wet ground, we can deduce that it rained last night."
  },
  "deference": {
    "pos": "noun",
    "def": "Polite respect and submission to someone's wishes or authority.",
    "context": "In context: Describes courteous yielding to the judgment or wishes of another.",
    "synonyms": ["respect","regard","courtesy"],
    "antonyms": ["disrespect","defiance","contempt","insolence"],
    "example": "He lowered his voice in deference to the sleeping baby."
  },
  "delineate": {
    "pos": "verb",
    "def": "To describe, draw, or explain something clearly in detail.",
    "context": "In context: Used when outlining or describing boundaries, duties, or features in precise detail.",
    "synonyms": ["outline","describe","define"],
    "antonyms": ["obscure","distort","confuse","blur"],
    "example": "The map clearly delineates the border between towns."
  },
  "detrimental": {
    "pos": "adjective",
    "def": "Causing harm, damage, or disadvantage.",
    "context": "In context: Used when a condition or action causes measurable harm, impairment, or disadvantage.",
    "synonyms": ["harmful","damaging","bad"],
    "antonyms": ["beneficial","advantageous","helpful","favorable"],
    "example": "Eating too much sugar is detrimental to your teeth."
  },
  "dichotomy": {
    "pos": "noun",
    "def": "A division or sharp contrast between two opposite things.",
    "context": "In context: Refers to a clear division between two completely opposite concepts or categories.",
    "synonyms": ["contrast","split","division"],
    "antonyms": ["harmony","unity","similarity","synthesis"],
    "example": "There is a clear dichotomy between city and country life."
  },
  "diminish": {
    "pos": "verb",
    "def": "To make or become smaller, fewer, or less important.",
    "context": "In context: Used when reducing the intensity, quantity, or importance of something.",
    "synonyms": ["reduce","decrease","lessen"],
    "antonyms": ["increase","expand","enhance","maximize"],
    "example": "The sound of rain began to diminish as the storm passed."
  },
  "discrepancy": {
    "pos": "noun",
    "def": "A difference or mismatch between two things that should be equal.",
    "context": "In context: Describes an unexpected conflict or difference between two sets of numbers, facts, or claims.",
    "synonyms": ["difference","mismatch","inconsistency"],
    "antonyms": ["consistency","agreement","similarity","match"],
    "example": "There was a discrepancy between the bill and what she ordered."
  },
  "disdain": {
    "pos": "noun",
    "def": "A feeling that someone or something does not deserve respect.",
    "context": "In context: Feeling that someone or something is unworthy of notice, value, or dignity.",
    "synonyms": ["scorn","disrespect","contempt"],
    "antonyms": ["respect","admiration","esteem","appreciation"],
    "example": "The cat looked at the bath water with pure disdain."
  },
  "disseminate": {
    "pos": "verb",
    "def": "To spread information, ideas, or news widely.",
    "context": "In context: Used when publishing or distributing knowledge, news, or reports widely.",
    "synonyms": ["spread","broadcast","distribute"],
    "antonyms": ["withhold","collect","gather","suppress"],
    "example": "The radio helps disseminate storm warnings to farmers."
  },
  "distort": {
    "pos": "verb",
    "def": "To pull or twist out of shape, making something look weird or untrue.",
    "context": "In context: Used when visual glare or noise warps the shape, color, or meaning of words.",
    "synonyms": ["twist","warp","bend"],
    "antonyms": ["clarify","preserve","correct","straighten"],
    "example": "Water drops on glasses can distort the letters."
  },
  "distortion": {
    "pos": "noun",
    "def": "A change that twists something out of its natural shape or meaning.",
    "context": "In context: In vision and Irlen syndrome, refers to visual illusions like rippling, blurring, or moving text.",
    "synonyms": ["blur","warp","twist"],
    "antonyms": ["clarity","fidelity","accuracy","truth"],
    "example": "Pattern glare causes visual distortion on high-contrast white pages."
  },
  "divergent": {
    "pos": "adjective",
    "def": "Moving in different directions or developing different views.",
    "context": "In context: Describes paths, opinions, or modes of thought that move in contrasting directions.",
    "synonyms": ["different","separate","varying"],
    "antonyms": ["convergent","identical","similar","uniform"],
    "example": "The two friends took divergent career paths after college."
  },
  "dyslexia": {
    "pos": "noun",
    "def": "A common learning difference that makes reading, writing, and spelling trickier.",
    "context": "In context: A learning difference involving how the brain processes language, phonetics, and written text.",
    "synonyms": ["reading difference","learning style"],
    "antonyms": ["neurotypical reading"],
    "example": "People with dyslexia are often creative problem solvers."
  },
  "eloquent": {
    "pos": "adjective",
    "def": "Speaking or writing in a fluent, expressive, and persuasive way.",
    "context": "In context: Characterized by persuasive, flowing, and emotionally resonant expression.",
    "synonyms": ["well-spoken","moving","persuasive"],
    "antonyms": ["inarticulate","clumsy","tongue-tied","awkward"],
    "example": "The speaker gave an eloquent speech that moved the audience."
  },
  "elucidate": {
    "pos": "verb",
    "def": "To make something clear or easy to understand by explaining it.",
    "context": "In context: Used when providing examples and plain language to make complex topics clear.",
    "synonyms": ["explain","clarify","clear up"],
    "antonyms": ["confuse","obscure","muddle","complicate"],
    "example": "The scientist used diagrams to elucidate how the solar panels work."
  },
  "empathy": {
    "pos": "noun",
    "def": "The ability to understand and share the feelings of another person.",
    "context": "In context: The emotional skill of feeling and understanding another person's feelings and standpoint.",
    "synonyms": ["understanding","compassion","caring"],
    "antonyms": ["apathy","indifference","callousness","detachment"],
    "example": "She felt deep empathy when her friend lost their beloved pet."
  },
  "empirical": {
    "pos": "adjective",
    "def": "Based on actual testing, experiments, or observation rather than theory.",
    "context": "In context: Based on direct observation, scientific experiments, and verifiable proof rather than theory.",
    "synonyms": ["practical","observed","tested"],
    "antonyms": ["theoretical","hypothetical","speculative","untested"],
    "example": "Doctors rely on empirical evidence before approving medicine."
  },
  "enhance": {
    "pos": "verb",
    "def": "To improve the quality, value, or strength of something.",
    "context": "In context: Used when adding features, colors, or fonts to boost reading fluency and visual quality.",
    "synonyms": ["improve","boost","upgrade"],
    "antonyms": ["diminish","degrade","worsen","impair"],
    "example": "OpenDyslexic fonts enhance reading comfort for many users."
  },
  "equivocal": {
    "pos": "adjective",
    "def": "Open to more than one meaning; deliberately misleading.",
    "context": "In context: Intentionally unclear or open to various interpretations to avoid taking a stand.",
    "synonyms": ["vague","uncertain","misleading"],
    "antonyms": ["unequivocal","clear","decisive","direct"],
    "example": "The politician gave an equivocal answer to avoid taking sides."
  },
  "erratic": {
    "pos": "adjective",
    "def": "Not regular or predictable; moving or changing unevenly.",
    "context": "In context: Describes movements or habits that wander without regularity or rhythm.",
    "synonyms": ["unpredictable","uneven","random"],
    "antonyms": ["consistent","regular","predictable","steady"],
    "example": "The driver's erratic movements made other cars stay back."
  },
  "exemplary": {
    "pos": "adjective",
    "def": "So good that it serves as a wonderful model for others to follow.",
    "context": "In context: Serving as an outstanding role model or standard that others should emulate.",
    "synonyms": ["model","excellent","admirable"],
    "antonyms": ["unworthy","flawed","poor","reprehensible"],
    "example": "The student received an award for her exemplary attendance."
  },
  "facilitate": {
    "pos": "verb",
    "def": "To make a process or action easier or smoother.",
    "context": "In context: Used when design interventions or accommodations make reading tasks smoother.",
    "synonyms": ["help","ease","assist"],
    "antonyms": ["impede","hinder","block","obstruct"],
    "example": "Visual aids facilitate better reading comprehension."
  },
  "fallacy": {
    "pos": "noun",
    "def": "A mistaken belief or a false idea that sounds convincing.",
    "context": "In context: Refers to an erroneous belief or a flaw in logical reasoning that invalidates an argument.",
    "synonyms": ["misconception","falsehood","myth"],
    "antonyms": ["truth","fact","validity","logic"],
    "example": "It is a fallacy that eating carrots gives you night vision."
  },
  "fastidious": {
    "pos": "adjective",
    "def": "Paying huge attention to accuracy, clean details, and perfection.",
    "context": "In context: Showing meticulous attention to cleanliness, precision, or exact layout.",
    "synonyms": ["picky","fussy","detailed"],
    "antonyms": ["careless","sloppy","lenient","unfussy"],
    "example": "The baker was fastidious about the temperature of the oven."
  },
  "feasible": {
    "pos": "adjective",
    "def": "Possible to do easily or conveniently.",
    "context": "In context: Capable of being achieved conveniently within existing time, budget, and resources.",
    "synonyms": ["doable","practical","workable"],
    "antonyms": ["impossible","unworkable","impractical","unfeasible"],
    "example": "Finishing the painting by Friday is totally feasible."
  },
  "fixation": {
    "pos": "noun",
    "def": "A brief pause where the eyes stop to focus and take in a word.",
    "context": "In context: In eye movement, refers to the brief pause when the eye stops on a word to read it.",
    "synonyms": ["focus point","pause","stopping point"],
    "antonyms": ["saccade","glance","inattention"],
    "example": "Bionic reading guides eye fixation to the start of each word."
  },
  "fluency": {
    "pos": "noun",
    "def": "The ability to read or speak smoothly, easily, and expressively.",
    "context": "In context: The ability to read or speak accurately, smoothly, and with comfortable pacing.",
    "synonyms": ["smoothness","ease","flow"],
    "antonyms": ["hesitation","haltingness","struggle"],
    "example": "Lexend fonts are designed to improve reading fluency."
  },
  "fluent": {
    "pos": "adjective",
    "def": "Able to express oneself or read easily and articulately.",
    "context": "In context: Capable of reading or speaking naturally without stumbling over words.",
    "synonyms": ["smooth","easy","effortless"],
    "antonyms": ["halting","hesitant","struggling","clumsy"],
    "example": "With practice, she became a fluent reader."
  },
  "foster": {
    "pos": "verb",
    "def": "To encourage the growth, development, or care of something.",
    "context": "In context: Used when cultivating skills, positive habits, or learning confidence over time.",
    "synonyms": ["encourage","promote","nurture"],
    "antonyms": ["suppress","neglect","discourage","inhibit"],
    "example": "Reading stories helps foster creativity in children."
  },
  "fundamental": {
    "pos": "adjective",
    "def": "Forming a necessary base or core; of central importance.",
    "context": "In context: Serving as the foundational core or bedrock on which other structures rely.",
    "synonyms": ["basic","essential","core"],
    "antonyms": ["superficial","peripheral","minor","secondary"],
    "example": "Alphabet recognition is a fundamental part of learning to read."
  },
  "glare": {
    "pos": "noun",
    "def": "A harsh, uncomfortably bright light that strains the eyes.",
    "context": "In context: Intense or reflective screen light that triggers eye strain and visual stress.",
    "synonyms": ["brightness","shine","harsh light"],
    "antonyms": ["softness","dimness","matte","shadow"],
    "example": "A warm tint reduces glare on white screens."
  },
  "gregarious": {
    "pos": "adjective",
    "def": "Fond of company; sociable and enjoying other people.",
    "context": "In context: Describes a personality that thrives in the company of friends and social gatherings.",
    "synonyms": ["sociable","friendly","outgoing"],
    "antonyms": ["solitary","reserved","unsociable","withdrawn"],
    "example": "Parrots are gregarious birds that love being around others."
  },
  "haphazard": {
    "pos": "adjective",
    "def": "Lacking any obvious plan, order, or direction.",
    "context": "In context: Characterized by lack of planning or random arrangement.",
    "synonyms": ["messy","random","disorganized"],
    "antonyms": ["systematic","deliberate","methodical","organized"],
    "example": "Books were stacked in a haphazard pile on the floor."
  },
  "hierarchy": {
    "pos": "noun",
    "def": "A system where members are ranked according to status or authority.",
    "context": "In context: Visual structure (such as titles, headings, and body) that signals priority to readers.",
    "synonyms": ["ranking","order","ladder"],
    "antonyms": ["equality","disorganization","anarchy"],
    "example": "In the bee hierarchy, the queen bee is at the top."
  },
  "hypothetical": {
    "pos": "adjective",
    "def": "Based on a suggested idea or guess rather than a real event.",
    "context": "In context: Based on a proposed scenario or assumption for the sake of reasoning or argument.",
    "synonyms": ["imagined","theoretical","supposed"],
    "antonyms": ["actual","real","proven","factual"],
    "example": "Let us consider a hypothetical situation where cars fly."
  },
  "idiosyncrasy": {
    "pos": "noun",
    "def": "A personal habit, quirk, or odd mannerism unique to one person.",
    "context": "In context: A distinct, quirky personal trait, habit, or design characteristic.",
    "synonyms": ["quirk","habit","peculiarity"],
    "antonyms": ["normality","conformity","universality"],
    "example": "Wiggling his nose before sneezing was his funny idiosyncrasy."
  },
  "impair": {
    "pos": "verb",
    "def": "To weaken, damage, or reduce the ability of something.",
    "context": "In context: Used when conditions degrade sensory perception or reading speed.",
    "synonyms": ["damage","weaken","harm"],
    "antonyms": ["improve","enhance","strengthen","cure"],
    "example": "Bright screen glare can impair your reading stamina."
  },
  "imperative": {
    "pos": "adjective",
    "def": "Of vital importance; crucial and urgent.",
    "context": "In context: Denotes a critical necessity that demands immediate attention and execution.",
    "synonyms": ["essential","urgent","crucial"],
    "antonyms": ["optional","trivial","secondary","unnecessary"],
    "example": "It is imperative that you wear a seatbelt in the car."
  },
  "implicit": {
    "pos": "adjective",
    "def": "Understood without being directly stated in words.",
    "context": "In context: Understood or inferred through clues rather than explicitly spoken or written out.",
    "synonyms": ["implied","unspoken","understood"],
    "antonyms": ["explicit","direct","overt","stated"],
    "example": "Their smile was an implicit sign that they approved."
  },
  "impose": {
    "pos": "verb",
    "def": "To force something welcome or unwelcome upon someone.",
    "context": "In context: Used when establishing an authoritative rule, burden, or limitation on others.",
    "synonyms": ["force","inflict","place"],
    "antonyms": ["lift","remove","allow","request"],
    "example": "The judge decided not to impose a heavy fine."
  },
  "incentive": {
    "pos": "noun",
    "def": "Something that motivates or encourages someone to do something.",
    "context": "In context: A motivating reward or reason that drives greater effort and productivity.",
    "synonyms": ["motivation","reward","reason"],
    "antonyms": ["deterrent","disincentive","discouragement"],
    "example": "A sticker on the chart was a fun incentive to read daily."
  },
  "indifferent": {
    "pos": "adjective",
    "def": "Having no particular interest, sympathy, or concern.",
    "context": "In context: Showing absence of interest, preference, or emotional investment.",
    "synonyms": ["unconcerned","neutral","uninterested"],
    "antonyms": ["caring","enthusiastic","passionate","concerned"],
    "example": "He was indifferent about whether we watched comedy or drama."
  },
  "inevitable": {
    "pos": "adjective",
    "def": "Certain to happen; unavoidable.",
    "context": "In context: Describes events that cannot be avoided and are bound to happen.",
    "synonyms": ["unavoidable","sure","certain"],
    "antonyms": ["avoidable","preventable","uncertain","unlikely"],
    "example": "Sunset is inevitable at the end of every day."
  },
  "infer": {
    "pos": "verb",
    "def": "To figure something out from clues rather than direct statements.",
    "context": "In context: Concluding something through deductive reasoning and context clues rather than literal words.",
    "synonyms": ["deduce","conclude","guess"],
    "antonyms": ["state directly","misunderstand","ignore"],
    "example": "From his smile, we could infer that he passed the test."
  },
  "inherent": {
    "pos": "adjective",
    "def": "Existing as a natural and permanent part of something.",
    "context": "In context: An inseparable, essential quality that belongs naturally to someone or something.",
    "synonyms": ["natural","built-in","inborn"],
    "antonyms": ["extrinsic","foreign","acquired","alien"],
    "example": "Curiosity is an inherent trait of young kittens."
  },
  "innovate": {
    "pos": "verb",
    "def": "To make changes in something established, introducing new methods or ideas.",
    "context": "In context: Developing novel ideas, technologies, or accessibility approaches that solve problems.",
    "synonyms": ["create","invent","modernize"],
    "antonyms": ["replicate","stagnate","copy","regress"],
    "example": "The company tries to innovate every year with fresh tools."
  },
  "intervention": {
    "pos": "noun",
    "def": "An action or tool introduced to help solve a difficulty or improve a condition.",
    "context": "In context: In accessibility, specialized typographic or color adaptations applied to improve reading comfort.",
    "synonyms": ["aid","help","support","accommodation"],
    "antonyms": ["neglect","noninterference","inaction"],
    "example": "Font spacing is an effective typographic intervention for dyslexia."
  },
  "intricate": {
    "pos": "adjective",
    "def": "Very complicated, detailed, or made of many small parts.",
    "context": "In context: Possessing numerous small, interrelated pieces or elaborate, delicate details.",
    "synonyms": ["complex","detailed","elaborate"],
    "antonyms": ["simple","plain","straightforward","basic"],
    "example": "The spider spun an intricate web between two branches."
  },
  "intrinsic": {
    "pos": "adjective",
    "def": "Belonging naturally; essential to the real nature of a thing.",
    "context": "In context: Belonging naturally and fundamentally to the core nature of a person, object, or system.",
    "synonyms": ["inborn","natural","core"],
    "antonyms": ["extrinsic","external","foreign","superficial"],
    "example": "Helping others gave her intrinsic happiness."
  },
  "judicious": {
    "pos": "adjective",
    "def": "Having, showing, or done with good sense and wise judgment.",
    "context": "In context: Exercising good judgment, wisdom, and careful consideration.",
    "synonyms": ["wise","sensible","careful"],
    "antonyms": ["foolish","imprudent","rash","indiscreet"],
    "example": "He made a judicious choice to save half his earnings."
  },
  "juxtapose": {
    "pos": "verb",
    "def": "To place two things side by side to compare or contrast them.",
    "context": "In context: Placing contrasting elements side-by-side to highlight comparisons and differences.",
    "synonyms": ["compare","contrast","place together"],
    "antonyms": ["separate","isolate","dissociate"],
    "example": "The artist liked to juxtapose modern cities next to wild forests."
  },
  "kerning": {
    "pos": "noun",
    "def": "The spacing between individual letters in a word.",
    "context": "In context: In typography, the horizontal spacing adjustment between individual character pairs.",
    "synonyms": ["letter spacing","tracking"],
    "antonyms": ["uniform spacing"],
    "example": "Wider kerning stops letters from blending together."
  },
  "kinetic": {
    "pos": "adjective",
    "def": "Relating to or resulting from movement and motion.",
    "context": "In context: Relating to or caused by physical motion, dynamic energy, and movement.",
    "synonyms": ["moving","active","dynamic"],
    "antonyms": ["static","stationary","motionless","dormant"],
    "example": "A spinning top has kinetic energy."
  },
  "leading": {
    "pos": "noun",
    "def": "The vertical space between lines of text in a paragraph.",
    "context": "In context: In typography, the vertical distance from the baseline of one line of text to the next.",
    "synonyms": ["line height","vertical spacing"],
    "antonyms": ["tight line spacing"],
    "example": "Increasing the leading makes lines easier to track."
  },
  "legibility": {
    "pos": "noun",
    "def": "How easily individual letters and words can be distinguished and read.",
    "context": "In context: How easily individual letterforms and words can be distinguished from each other.",
    "synonyms": ["readability","clarity","clearness"],
    "antonyms": ["illegibility","obscurity","blurriness"],
    "example": "High contrast improves screen legibility."
  },
  "lucid": {
    "pos": "adjective",
    "def": "Expressed clearly; easy to understand; bright and luminous.",
    "context": "In context: Expressed in a transparent, easily intelligible, and mentally sharp style.",
    "synonyms": ["clear","plain","understandable"],
    "antonyms": ["confused","muddled","obscure","unclear"],
    "example": "The instructions were so lucid that anyone could build the desk."
  },
  "magnanimous": {
    "pos": "adjective",
    "def": "Very generous or forgiving, especially toward a rival or less powerful person.",
    "context": "In context: Generous in forgiving an insult or injury; free from petty resentment.",
    "synonyms": ["generous","forgiving","big-hearted"],
    "antonyms": ["petty","selfish","vindictive","mean"],
    "example": "He was magnanimous in victory and praised the other team."
  },
  "mandatory": {
    "pos": "adjective",
    "def": "Required by law or rules; compulsory.",
    "context": "In context: Required by authority or law; compulsory.",
    "synonyms": ["required","compulsory","needed"],
    "antonyms": ["optional","voluntary","elective"],
    "example": "Wearing a helmet while cycling is mandatory in this park."
  },
  "meticulous": {
    "pos": "adjective",
    "def": "Showing great attention to detail; very careful and precise.",
    "context": "In context: Showing intense care and thoroughness toward precision and small points.",
    "synonyms": ["careful","detailed","precise"],
    "antonyms": ["careless","sloppy","negligent","hurried"],
    "example": "The watchmaker was meticulous when placing the tiny gears."
  },
  "mitigate": {
    "pos": "verb",
    "def": "To make something less severe, painful, or damaging.",
    "context": "In context: Taking steps to lessen the gravity, pain, or severity of a problem or condition.",
    "synonyms": ["reduce","soften","lessen"],
    "antonyms": ["aggravate","worsen","escalate","intensify"],
    "example": "Planting trees helps mitigate wind damage during storms."
  },
  "monotonous": {
    "pos": "adjective",
    "def": "Dull, tedious, and repetitious; lacking in variety.",
    "context": "In context: Sounding or repeating without variation, causing boredom and fatigue.",
    "synonyms": ["boring","repetitive","unvarying"],
    "antonyms": ["varied","exciting","diverse","lively"],
    "example": "Clicking the same button all day was a monotonous task."
  },
  "negligible": {
    "pos": "adjective",
    "def": "So small or unimportant as to not be worth considering.",
    "context": "In context: So small, trivial, or unimportant that it may be disregarded.",
    "synonyms": ["tiny","minor","insignificant"],
    "antonyms": ["significant","substantial","crucial","major"],
    "example": "The scratch on the bumper was negligible and barely visible."
  },
  "neurodivergent": {
    "pos": "adjective",
    "def": "Having a brain that learns, thinks, or processes information differently from what is typical.",
    "context": "In context: Having cognitive processing that differs from neurotypical norms, as in dyslexia, ADHD, or autism.",
    "synonyms": ["diverse brain","unique thinker"],
    "antonyms": ["neurotypical"],
    "example": "Dyslexia and ADHD are common neurodivergent traits."
  },
  "nonchalant": {
    "pos": "adjective",
    "def": "Appearing calm and relaxed; not showing anxiety or interest.",
    "context": "In context: Projecting an air of relaxed indifference or calm unconcern.",
    "synonyms": ["casual","calm","unconcerned"],
    "antonyms": ["anxious","agitated","concerned","excited"],
    "example": "He gave a nonchalant shrug as if winning did not surprise him."
  },
  "nostalgia": {
    "pos": "noun",
    "def": "A warm, wistful feeling of affection for the past.",
    "context": "In context: A bittersweet sentimental yearning for a past era, place, or childhood experience.",
    "synonyms": ["reminiscence","longing","memory"],
    "antonyms": ["forward-looking","modernity","indifference"],
    "example": "Looking at childhood photos filled him with nostalgia."
  },
  "novel": {
    "pos": "adjective",
    "def": "New, fresh, and not resembling anything used or known before.",
    "context": "In context: New, original, and unprecedented in style, thinking, or technology.",
    "synonyms": ["new","unique","innovative"],
    "antonyms": ["common","traditional","outdated","familiar"],
    "example": "The team designed a novel way to save solar battery energy."
  },
  "nuance": {
    "pos": "noun",
    "def": "A subtle or delicate difference in meaning, expression, or sound.",
    "context": "In context: A subtle difference in shade of meaning, tone, opinion, or artistic expression.",
    "synonyms": ["subtlety","shade","fine point"],
    "antonyms": ["broadness","crudeness","obviousness"],
    "example": "An experienced actor catches every nuance in a script."
  },
  "objective": {
    "pos": "adjective",
    "def": "Not influenced by personal feelings; based on real facts.",
    "context": "In context: Evaluating facts purely without personal feelings, emotions, or bias.",
    "synonyms": ["unbiased","fair","neutral"],
    "antonyms": ["subjective","biased","prejudiced","partial"],
    "example": "A referee must remain objective throughout the game."
  },
  "obsolete": {
    "pos": "adjective",
    "def": "No longer produced or used; out of date.",
    "context": "In context: Outdated and no longer in active use because a superior replacement exists.",
    "synonyms": ["outdated","old","discontinued"],
    "antonyms": ["modern","current","contemporary","cutting-edge"],
    "example": "Floppy disks became obsolete once flash drives arrived."
  },
  "omniscient": {
    "pos": "adjective",
    "def": "Knowing everything; having complete and infinite knowledge.",
    "context": "In context: Possessing complete or boundless awareness and knowledge of everything.",
    "synonyms": ["all-knowing","all-wise"],
    "antonyms": ["uninformed","ignorant","limited"],
    "example": "The story was told by an omniscient narrator."
  },
  "opaque": {
    "pos": "adjective",
    "def": "Not able to be seen through; not transparent.",
    "context": "In context: Not transmitting light; also used metaphorically for language that is impossible to penetrate.",
    "synonyms": ["cloudy","solid","non-transparent"],
    "antonyms": ["transparent","translucent","clear","lucid"],
    "example": "The frosted shower door is opaque for privacy."
  },
  "optimum": {
    "pos": "adjective",
    "def": "Most favorable or advantageous; best.",
    "context": "In context: The most favorable or advantageous condition for highest performance or health.",
    "synonyms": ["best","ideal","peak"],
    "antonyms": ["worst","poorest","suboptimal","inferior"],
    "example": "Spring provides optimum weather for planting flowers."
  },
  "paradox": {
    "pos": "noun",
    "def": "A statement that seems contradictory but may actually be true.",
    "context": "In context: A proposition that seems self-contradictory yet expresses a deeper truth.",
    "synonyms": ["puzzle","contradiction","riddle"],
    "antonyms": ["truism","normality","certainty"],
    "example": "It is a paradox that the more you give, the richer you feel."
  },
  "paramount": {
    "pos": "adjective",
    "def": "More important than anything else; supreme.",
    "context": "In context: Ranked supreme in ranking, significance, or operational priority.",
    "synonyms": ["top","chief","primary"],
    "antonyms": ["minor","secondary","subordinate","trivial"],
    "example": "Passenger safety is paramount for airline pilots."
  },
  "perceptive": {
    "pos": "adjective",
    "def": "Having or showing sensitive insight and keen observation.",
    "context": "In context: Demonstrating keen intuition and insight into details that others miss.",
    "synonyms": ["observant","sharp","insightful"],
    "antonyms": ["imperceptive","blind","unaware","dense"],
    "example": "The perceptive teacher noticed the student was feeling sad."
  },
  "perseverance": {
    "pos": "noun",
    "def": "Continuing to do something despite difficulties and delays.",
    "context": "In context: Continuing steadfastly through challenges until the objective is reached.",
    "synonyms": ["persistence","determination","grit"],
    "antonyms": ["quitting","giving up","hesitation","apathy"],
    "example": "Through perseverance and practice, he learned to play guitar."
  },
  "pervasive": {
    "pos": "adjective",
    "def": "Spreading widely throughout an area or group of people.",
    "context": "In context: Spreading widely throughout every facet of an environment, group, or system.",
    "synonyms": ["widespread","prevalent","common"],
    "antonyms": ["contained","localized","rare","restricted"],
    "example": "The sweet smell of baked bread was pervasive throughout the house."
  },
  "plausible": {
    "pos": "adjective",
    "def": "Seeming reasonable or probable; believable.",
    "context": "In context: Appearing reasonable, valid, or likely to be true based on available facts.",
    "synonyms": ["believable","likely","credible"],
    "antonyms": ["implausible","unbelievable","unlikely","absurd"],
    "example": "His explanation for being late was plausible and honest."
  },
  "pragmatic": {
    "pos": "adjective",
    "def": "Dealing with things sensibly and realistically rather than theoretically.",
    "context": "In context: Focusing strictly on realistic, workable methods rather than theoretical ideals.",
    "synonyms": ["practical","sensible","realistic"],
    "antonyms": ["idealistic","impractical","unrealistic","fanciful"],
    "example": "She took a pragmatic approach to budget her grocery spending."
  },
  "preliminary": {
    "pos": "adjective",
    "def": "Happening before a more important event; introductory.",
    "context": "In context: Introducing or preparing for the main action or substantive stage of a project.",
    "synonyms": ["initial","introductory","starting"],
    "antonyms": ["final","concluding","ultimate","terminal"],
    "example": "The doctor shared the preliminary results of the checkup."
  },
  "prevalent": {
    "pos": "adjective",
    "def": "Widespread in a particular area or at a particular time.",
    "context": "In context: Existing widely, abundantly, or frequently within a designated group or territory.",
    "synonyms": ["common","widespread","frequent"],
    "antonyms": ["rare","uncommon","isolated","scarce"],
    "example": "Colds are more prevalent during winter months."
  },
  "profound": {
    "pos": "adjective",
    "def": "Very great or intense; having deep meaning.",
    "context": "In context: Having deep insight, emotional weight, or transforming philosophical significance.",
    "synonyms": ["deep","meaningful","great"],
    "antonyms": ["shallow","superficial","trivial","mild"],
    "example": "The poem had a profound effect on everyone who read it."
  },
  "prolific": {
    "pos": "adjective",
    "def": "Producing much fruit or foliage or many works.",
    "context": "In context: Producing an abundant quantity of works, ideas, fruit, or offspring.",
    "synonyms": ["productive","fruitful","creative"],
    "antonyms": ["unproductive","barren","sparse","sterile"],
    "example": "The prolific author wrote two novels every single year."
  },
  "prospective": {
    "pos": "adjective",
    "def": "Expected or likely to happen or become something in the future.",
    "context": "In context: Anticipated or likely to happen or become in the near future.",
    "synonyms": ["potential","future","likely"],
    "antonyms": ["past","current","retrospective"],
    "example": "The campus tour is great for prospective college students."
  },
  "prudent": {
    "pos": "adjective",
    "def": "Acting with or showing care and thought for the future.",
    "context": "In context: Exercising careful foresight, caution, and discretion to prevent harm.",
    "synonyms": ["wise","cautious","careful"],
    "antonyms": ["reckless","foolish","careless","imprudent"],
    "example": "It is prudent to bring an umbrella when clouds turn gray."
  },
  "redundant": {
    "pos": "adjective",
    "def": "Not needed or useful; repeating what is already there.",
    "context": "In context: Exceeding what is strictly required; repetitive without contributing new value.",
    "synonyms": ["unnecessary","repetitive","extra"],
    "antonyms": ["necessary","essential","concise","sparse"],
    "example": "Saying 'free gift' is redundant because gifts are always free."
  },
  "reiterate": {
    "pos": "verb",
    "def": "To say something again or a number of times for clarity.",
    "context": "In context: Stating or saying something again repeatedly for clarity and emphasis.",
    "synonyms": ["repeat","restate","emphasize"],
    "antonyms": ["retract","recant","silence"],
    "example": "The teacher reiterated the homework instructions twice."
  },
  "relinquish": {
    "pos": "verb",
    "def": "To voluntarily cease to keep or claim; to give up.",
    "context": "In context: Voluntarily surrendering control, possession, or a formal claim to something.",
    "synonyms": ["give up","release","let go"],
    "antonyms": ["retain","keep","claim","hold"],
    "example": "The older champion had to relinquish his crown after the race."
  },
  "reprehensible": {
    "pos": "adjective",
    "def": "Deserving severe disapproval or blame; very bad.",
    "context": "In context: Highly blameworthy and deserving of severe moral censure or condemnation.",
    "synonyms": ["shameful","blameworthy","bad"],
    "antonyms": ["praiseworthy","commendable","honorable","noble"],
    "example": "Cheating on the exam was reprehensible behavior."
  },
  "resilient": {
    "pos": "adjective",
    "def": "Able to withstand or recover quickly from difficult conditions.",
    "context": "In context: Able to bounce back swiftly from setbacks, injury, stress, or change.",
    "synonyms": ["strong","adaptable","tough"],
    "antonyms": ["fragile","vulnerable","weak","brittle"],
    "example": "Young plants are surprisingly resilient after heavy storms."
  },
  "retrospect": {
    "pos": "noun",
    "def": "A survey or review of a past course of events or period of time.",
    "context": "In context: Contemplating or reviewing past events with the benefit of hindsight.",
    "synonyms": ["hindsight","looking back","review"],
    "antonyms": ["prospect","anticipation","foresight"],
    "example": "In retrospect, buying the sturdy winter boots was a smart move."
  },
  "robust": {
    "pos": "adjective",
    "def": "Strong and healthy; vigorous; able to handle stress.",
    "context": "In context: Strong, resilient, and performing reliably under stressful conditions.",
    "synonyms": ["strong","tough","durable"],
    "antonyms": ["fragile","flimsy","weak","delicate"],
    "example": "The hikers wore robust shoes made for rocky mountain trails."
  },
  "saccadic": {
    "pos": "adjective",
    "def": "Relating to the quick, simultaneous jumps that eyes make while reading.",
    "context": "In context: In reading, the rapid, ballistic jumps eyes make across text lines between fixations.",
    "synonyms": ["eye jumps","rapid eye movement"],
    "antonyms": ["smooth pursuit","continuous gaze"],
    "example": "Bionic reading guides saccadic eye jumps between words."
  },
  "scrutinize": {
    "pos": "verb",
    "def": "To examine or inspect something closely and thoroughly.",
    "context": "In context: Inspecting every tiny detail with intense, critical, and careful scrutiny.",
    "synonyms": ["inspect","examine","study"],
    "antonyms": ["glance","skim","overlook","ignore"],
    "example": "Detectives will scrutinize the fingerprints on the counter."
  },
  "spacing": {
    "pos": "noun",
    "def": "The distance left between letters, words, or lines.",
    "context": "In context: In typography, the horizontal room left between words to prevent blurring and eye crowding.",
    "synonyms": ["gap","distance","interval"],
    "antonyms": ["crowding","compression"],
    "example": "Clear spacing helps separate adjacent words."
  },
  "spontaneous": {
    "pos": "adjective",
    "def": "Happening naturally without being planned ahead of time.",
    "context": "In context: Occurring naturally and immediately on impulse without advance calculation.",
    "synonyms": ["unplanned","natural","impulsive"],
    "antonyms": ["planned","calculated","deliberate","rehearsed"],
    "example": "The crowd broke into spontaneous applause after the song."
  },
  "stagnant": {
    "pos": "adjective",
    "def": "Not flowing or moving; not developing or advancing.",
    "context": "In context: Motionless and lacking current, often becoming foul or showing zero development.",
    "synonyms": ["still","motionless","inactive"],
    "antonyms": ["flowing","active","dynamic","vibrant"],
    "example": "Mosquitoes lay eggs in stagnant puddle water."
  },
  "subsequent": {
    "pos": "adjective",
    "def": "Coming after something in time; following.",
    "context": "In context: Coming, following, or happening after an initial action or period in time.",
    "synonyms": ["following","next","later"],
    "antonyms": ["prior","previous","preceding","earlier"],
    "example": "The first chapter was slow, but subsequent chapters were exciting."
  },
  "substantiate": {
    "pos": "verb",
    "def": "To provide evidence to support or prove the truth of something.",
    "context": "In context: Supplying tangible facts, research, or evidence to validate a claim.",
    "synonyms": ["prove","confirm","back up"],
    "antonyms": ["disprove","refute","undermine","debunk"],
    "example": "The scientist had lab data to substantiate her hypothesis."
  },
  "superfluous": {
    "pos": "adjective",
    "def": "More than what is needed; unnecessary extra.",
    "context": "In context: More than is needed; redundant, decorative, or useless surplus.",
    "synonyms": ["extra","unneeded","excessive"],
    "antonyms": ["essential","necessary","critical","needed"],
    "example": "Packing five coats for a sunny weekend trip is superfluous."
  },
  "tangible": {
    "pos": "adjective",
    "def": "Perceptible by touch; clear, definite, and real.",
    "context": "In context: Capable of being touched, physically handled, or unmistakably perceived as real.",
    "synonyms": ["real","touchable","concrete"],
    "antonyms": ["intangible","abstract","unreal","illusory"],
    "example": "Holding a printed diploma made his achievement feel tangible."
  },
  "tenacious": {
    "pos": "adjective",
    "def": "Holding fast; persistent and refusing to give up.",
    "context": "In context: Gripping tenaciously to a task or purpose with relentless determination.",
    "synonyms": ["persistent","stubborn","determined"],
    "antonyms": ["quitting","weak","yielding","irresolute"],
    "example": "The tenacious puppy refused to drop the tennis ball."
  },
  "tentative": {
    "pos": "adjective",
    "def": "Not certain or fixed; provisional; hesitant.",
    "context": "In context: Proposed as a provisional step, open to revision and subject to future confirmation.",
    "synonyms": ["uncertain","provisional","hesitant"],
    "antonyms": ["definite","certain","final","conclusive"],
    "example": "They made a tentative plan to meet for lunch on Tuesday."
  },
  "tracking": {
    "pos": "noun",
    "def": "The overall uniform space across letters in a line of text.",
    "context": "In context: In typography, uniform adjustment of character spacing across an entire block of text.",
    "synonyms": ["letter spacing","kerning"],
    "antonyms": ["standard letter space"],
    "example": "Adding tracking helps people with dyslexia distinguish letters."
  },
  "typeface": {
    "pos": "noun",
    "def": "The visual design and shape of a set of letters and numbers.",
    "context": "In context: The unified artistic design of letters and glyphs, such as Lexend or OpenDyslexic.",
    "synonyms": ["font","letter design","font style"],
    "antonyms": ["handwriting"],
    "example": "OpenDyslexic is an accessible typeface designed for clarity."
  },
  "ubiquitous": {
    "pos": "adjective",
    "def": "Present, appearing, or found everywhere.",
    "context": "In context: Found or appearing everywhere at once; omnipresent.",
    "synonyms": ["everywhere","omnipresent","widespread"],
    "antonyms": ["rare","scarce","unusual","isolated"],
    "example": "Smartphones are ubiquitous in modern society."
  },
  "unprecedented": {
    "pos": "adjective",
    "def": "Never done or known before.",
    "context": "In context: Never before known, experienced, or documented in past records.",
    "synonyms": ["groundbreaking","first-time","unmatched"],
    "antonyms": ["common","routine","familiar","standard"],
    "example": "The spacecraft sent back unprecedented clear photos of Mars."
  },
  "valid": {
    "pos": "adjective",
    "def": "Having a sound basis in logic or fact; legally acceptable.",
    "context": "In context: Sound, well-founded, and legally or logically binding.",
    "synonyms": ["true","sound","acceptable"],
    "antonyms": ["invalid","false","unfounded","flawed"],
    "example": "You need a valid passport to travel abroad."
  },
  "verbose": {
    "pos": "adjective",
    "def": "Using or expressed in more words than are needed.",
    "context": "In context: Employing far more words than necessary, causing tedium or confusion.",
    "synonyms": ["wordy","long-winded","talkative"],
    "antonyms": ["concise","brief","succinct","laconic"],
    "example": "His essay was so verbose that it took twice as long to read."
  },
  "viable": {
    "pos": "adjective",
    "def": "Capable of working successfully; feasible.",
    "context": "In context: Capable of surviving, developing successfully, and functioning effectively in practice.",
    "synonyms": ["workable","practical","feasible"],
    "antonyms": ["unviable","impossible","unworkable","hopeless"],
    "example": "Solar power is a viable alternative to fossil fuels."
  },
  "vibrate": {
    "pos": "verb",
    "def": "To shake or quiver with rapid, small movements.",
    "context": "In context: Moving back and forth rapidly; in visual stress, text may seem to oscillate or vibrate.",
    "synonyms": ["shake","quiver","tremble"],
    "antonyms": ["stay still","steady","remain stationary"],
    "example": "Stark contrast can make text appear to vibrate."
  },
  "vindicate": {
    "pos": "verb",
    "def": "To clear someone of blame or suspicion with proof.",
    "context": "In context: Clearing someone of suspicion or proving a previous decision was right all along.",
    "synonyms": ["clear","exonerate","prove right"],
    "antonyms": ["condemn","blame","convict","incriminate"],
    "example": "The new witness evidence helped vindicate the accused man."
  },
  "volatile": {
    "pos": "adjective",
    "def": "Liable to change rapidly and unpredictably, especially for the worse.",
    "context": "In context: Liable to change rapidly and unpredictably, especially for the worse.",
    "synonyms": ["unstable","explosive","shifting"],
    "antonyms": ["stable","constant","steady","predictable"],
    "example": "Gasoline is a volatile liquid that catches fire easily."
  },
  "wary": {
    "pos": "adjective",
    "def": "Feeling or showing caution about possible dangers or problems.",
    "context": "In context: Feeling or showing cautious watchfulness regarding potential danger or deception.",
    "synonyms": ["cautious","careful","alert"],
    "antonyms": ["trusting","careless","unwary","rash"],
    "example": "Be wary of strange emails asking for your password."
  }
};

/**
 * Generate stem variations so inflected words match their base dictionary entries
 */

const COMMON_OFFLINE_ANTONYMS = {
  "happy": [
    "sad",
    "unhappy",
    "sorrowful",
    "depressed"
  ],
  "sad": [
    "happy",
    "cheerful",
    "glad",
    "joyful"
  ],
  "good": [
    "bad",
    "poor",
    "evil",
    "wicked"
  ],
  "bad": [
    "good",
    "great",
    "excellent",
    "fine"
  ],
  "fast": [
    "slow",
    "sluggish",
    "unhurried"
  ],
  "slow": [
    "fast",
    "quick",
    "rapid",
    "swift"
  ],
  "difficult": [
    "easy",
    "simple",
    "effortless"
  ],
  "easy": [
    "difficult",
    "hard",
    "tough",
    "challenging"
  ],
  "hard": [
    "soft",
    "easy",
    "flexible"
  ],
  "soft": [
    "hard",
    "firm",
    "stiff"
  ],
  "large": [
    "small",
    "little",
    "tiny"
  ],
  "small": [
    "large",
    "big",
    "huge",
    "giant"
  ],
  "big": [
    "small",
    "little",
    "tiny",
    "miniature"
  ],
  "hot": [
    "cold",
    "cool",
    "chilly",
    "freezing"
  ],
  "cold": [
    "hot",
    "warm",
    "heated"
  ],
  "dark": [
    "light",
    "bright",
    "clear"
  ],
  "light": [
    "dark",
    "heavy",
    "dim"
  ],
  "heavy": [
    "light",
    "weightless"
  ],
  "strong": [
    "weak",
    "frail",
    "feeble"
  ],
  "weak": [
    "strong",
    "powerful",
    "robust"
  ],
  "rich": [
    "poor",
    "needy",
    "destitute"
  ],
  "poor": [
    "rich",
    "wealthy",
    "prosperous"
  ],
  "clean": [
    "dirty",
    "filthy",
    "messy"
  ],
  "dirty": [
    "clean",
    "pure",
    "spotless"
  ],
  "clear": [
    "unclear",
    "vague",
    "cloudy",
    "blurry"
  ],
  "safe": [
    "dangerous",
    "risky",
    "unsafe"
  ],
  "dangerous": [
    "safe",
    "secure"
  ],
  "true": [
    "false",
    "untrue",
    "fake"
  ],
  "false": [
    "true",
    "accurate",
    "real"
  ],
  "right": [
    "wrong",
    "incorrect",
    "left"
  ],
  "wrong": [
    "right",
    "correct",
    "true"
  ],
  "early": [
    "late",
    "delayed"
  ],
  "late": [
    "early",
    "punctual"
  ],
  "near": [
    "far",
    "distant",
    "remote"
  ],
  "far": [
    "near",
    "close",
    "nearby"
  ],
  "open": [
    "closed",
    "shut"
  ],
  "closed": [
    "open",
    "unlocked"
  ],
  "full": [
    "empty",
    "vacant"
  ],
  "empty": [
    "full",
    "crowded"
  ],
  "bright": [
    "dim",
    "dark",
    "dull"
  ],
  "dim": [
    "bright",
    "luminous",
    "clear"
  ],
  "loud": [
    "quiet",
    "silent",
    "soft"
  ],
  "quiet": [
    "loud",
    "noisy",
    "boisterous"
  ],
  "deep": [
    "shallow",
    "superficial"
  ],
  "shallow": [
    "deep",
    "profound"
  ],
  "dry": [
    "wet",
    "damp",
    "moist"
  ],
  "wet": [
    "dry",
    "dehydrated"
  ],
  "active": [
    "inactive",
    "passive",
    "idle"
  ],
  "passive": [
    "active",
    "dynamic"
  ],
  "calm": [
    "anxious",
    "agitated",
    "nervous",
    "stormy"
  ],
  "brave": [
    "cowardly",
    "fearful",
    "timid"
  ],
  "cowardly": [
    "brave",
    "courageous",
    "bold"
  ],
  "sharp": [
    "dull",
    "blunt"
  ],
  "dull": [
    "sharp",
    "bright",
    "interesting"
  ],
  "smooth": [
    "rough",
    "bumpy",
    "coarse"
  ],
  "rough": [
    "smooth",
    "gentle",
    "even"
  ],
  "sweet": [
    "sour",
    "bitter",
    "salty"
  ],
  "bitter": [
    "sweet",
    "pleasant"
  ],
  "thick": [
    "thin",
    "slender",
    "lean"
  ],
  "thin": [
    "thick",
    "wide",
    "fat"
  ],
  "wide": [
    "narrow",
    "tight",
    "thin"
  ],
  "narrow": [
    "wide",
    "broad"
  ],
  "alive": [
    "dead",
    "deceased"
  ],
  "dead": [
    "alive",
    "living"
  ],
  "begin": [
    "end",
    "finish",
    "stop"
  ],
  "end": [
    "begin",
    "start"
  ],
  "create": [
    "destroy",
    "demolish",
    "ruin"
  ],
  "destroy": [
    "create",
    "build",
    "construct"
  ],
  "gain": [
    "lose",
    "loss",
    "decrease"
  ],
  "lose": [
    "win",
    "find",
    "gain"
  ],
  "give": [
    "take",
    "receive",
    "keep"
  ],
  "take": [
    "give",
    "offer",
    "return"
  ],
  "increase": [
    "decrease",
    "reduce",
    "diminish"
  ],
  "decrease": [
    "increase",
    "expand",
    "boost"
  ],
  "love": [
    "hate",
    "loathe",
    "dislike"
  ],
  "hate": [
    "love",
    "like",
    "adore"
  ],
  "peace": [
    "war",
    "conflict",
    "turmoil"
  ],
  "war": [
    "peace",
    "harmony"
  ],
  "raise": [
    "lower",
    "drop"
  ],
  "lower": [
    "raise",
    "elevate"
  ],
  "remember": [
    "forget",
    "overlook"
  ],
  "forget": [
    "remember",
    "recall"
  ],
  "rise": [
    "fall",
    "sink",
    "descend"
  ],
  "fall": [
    "rise",
    "climb"
  ],
  "win": [
    "lose",
    "fail"
  ],
  "accept": [
    "reject",
    "refuse",
    "decline"
  ],
  "reject": [
    "accept",
    "approve"
  ],
  "allow": [
    "forbid",
    "prohibit",
    "disallow"
  ],
  "forbid": [
    "allow",
    "permit"
  ],
  "appear": [
    "disappear",
    "vanish"
  ],
  "disappear": [
    "appear",
    "materialize"
  ],
  "arrive": [
    "depart",
    "leave"
  ],
  "depart": [
    "arrive",
    "stay"
  ],
  "build": [
    "destroy",
    "demolish"
  ],
  "buy": [
    "sell"
  ],
  "sell": [
    "buy",
    "purchase"
  ],
  "catch": [
    "miss",
    "release",
    "drop"
  ],
  "connect": [
    "disconnect",
    "separate"
  ],
  "expand": [
    "shrink",
    "contract"
  ],
  "shrink": [
    "expand",
    "grow"
  ],
  "fail": [
    "succeed",
    "pass"
  ],
  "succeed": [
    "fail",
    "falter"
  ],
  "find": [
    "lose",
    "misplace"
  ],
  "freeze": [
    "melt",
    "thaw"
  ],
  "melt": [
    "freeze",
    "solidify"
  ],
  "gather": [
    "scatter",
    "disperse"
  ],
  "hide": [
    "reveal",
    "show",
    "display"
  ],
  "reveal": [
    "hide",
    "conceal"
  ],
  "join": [
    "separate",
    "leave",
    "detach"
  ],
  "pull": [
    "push"
  ],
  "push": [
    "pull"
  ],
  "teach": [
    "learn"
  ],
  "learn": [
    "teach"
  ],
  "temporary": [
    "permanent",
    "lasting",
    "constant"
  ],
  "permanent": [
    "temporary",
    "fleeting"
  ],
  "visible": [
    "invisible",
    "hidden",
    "unseen"
  ],
  "invisible": [
    "visible",
    "clear"
  ],
  "willing": [
    "unwilling",
    "reluctant"
  ],
  "wise": [
    "foolish",
    "unwise",
    "silly"
  ],
  "foolish": [
    "wise",
    "sensible",
    "prudent"
  ],
  "young": [
    "old",
    "elderly",
    "aged"
  ],
  "old": [
    "young",
    "new",
    "fresh"
  ],
  "ancient": [
    "modern",
    "new",
    "recent",
    "contemporary"
  ],
  "modern": [
    "ancient",
    "archaic",
    "traditional",
    "historic"
  ],
  "complex": [
    "simple",
    "basic",
    "uncomplicated",
    "elementary"
  ],
  "simple": [
    "complex",
    "complicated",
    "intricate",
    "difficult"
  ],
  "huge": [
    "tiny",
    "small",
    "miniature",
    "minute"
  ],
  "giant": [
    "dwarf",
    "tiny",
    "miniature",
    "petite"
  ],
  "tiny": [
    "huge",
    "giant",
    "enormous",
    "massive"
  ],
  "massive": [
    "tiny",
    "slight",
    "flimsy",
    "delicate"
  ],
  "cheap": [
    "expensive",
    "costly",
    "valuable",
    "pricey"
  ],
  "expensive": [
    "cheap",
    "inexpensive",
    "affordable",
    "low-cost"
  ],
  "healthy": [
    "sick",
    "ill",
    "unhealthy",
    "diseased"
  ],
  "sick": [
    "healthy",
    "well",
    "fit",
    "sound"
  ],
  "polite": [
    "rude",
    "impolite",
    "discourteous",
    "insolent"
  ],
  "rude": [
    "polite",
    "courteous",
    "respectful",
    "civil"
  ],
  "generous": [
    "stingy",
    "selfish",
    "greedy",
    "miserly"
  ],
  "stingy": [
    "generous",
    "charitable",
    "bountiful",
    "giving"
  ],
  "patient": [
    "impatient",
    "restless",
    "agitated",
    "intolerant"
  ],
  "impatient": [
    "patient",
    "calm",
    "tolerant",
    "forbearing"
  ],
  "friendly": [
    "hostile",
    "unfriendly",
    "cold",
    "antagonistic"
  ],
  "hostile": [
    "friendly",
    "welcoming",
    "peaceful",
    "cordial"
  ],
  "kind": [
    "cruel",
    "mean",
    "harsh",
    "unkind"
  ],
  "cruel": [
    "kind",
    "gentle",
    "merciful",
    "compassionate"
  ],
  "honest": [
    "dishonest",
    "deceitful",
    "corrupt",
    "untruthful"
  ],
  "dishonest": [
    "honest",
    "truthful",
    "sincere",
    "trustworthy"
  ],
  "careful": [
    "careless",
    "reckless",
    "negligent",
    "heedless"
  ],
  "careless": [
    "careful",
    "cautious",
    "thorough",
    "attentive"
  ],
  "cautious": [
    "reckless",
    "rash",
    "bold",
    "careless"
  ],
  "reckless": [
    "cautious",
    "prudent",
    "careful",
    "wary"
  ],
  "anxious": [
    "calm",
    "relaxed",
    "peaceful",
    "serene"
  ],
  "rare": [
    "common",
    "frequent",
    "ordinary",
    "usual"
  ],
  "common": [
    "rare",
    "uncommon",
    "unusual",
    "unique"
  ],
  "unique": [
    "common",
    "ordinary",
    "standard",
    "generic"
  ],
  "normal": [
    "abnormal",
    "strange",
    "unusual",
    "odd"
  ],
  "strange": [
    "normal",
    "familiar",
    "ordinary",
    "typical"
  ],
  "familiar": [
    "unfamiliar",
    "unknown",
    "strange",
    "foreign"
  ],
  "foreign": [
    "native",
    "local",
    "domestic",
    "familiar"
  ],
  "native": [
    "foreign",
    "alien",
    "imported",
    "external"
  ],
  "public": [
    "private",
    "secret",
    "personal",
    "confidential"
  ],
  "private": [
    "public",
    "open",
    "communal",
    "shared"
  ],
  "major": [
    "minor",
    "secondary",
    "insignificant",
    "slight"
  ],
  "minor": [
    "major",
    "significant",
    "vital",
    "primary"
  ],
  "maximum": [
    "minimum",
    "least",
    "lowest"
  ],
  "minimum": [
    "maximum",
    "most",
    "highest"
  ],
  "superior": [
    "inferior",
    "poorer",
    "lower",
    "subordinate"
  ],
  "inferior": [
    "superior",
    "better",
    "higher",
    "greater"
  ],
  "senior": [
    "junior",
    "younger",
    "subordinate"
  ],
  "junior": [
    "senior",
    "elder",
    "superior"
  ],
  "noisy": [
    "quiet",
    "silent",
    "calm",
    "peaceful"
  ],
  "blunt": [
    "sharp",
    "pointed",
    "keen"
  ],
  "tight": [
    "loose",
    "slack",
    "baggy"
  ],
  "loose": [
    "tight",
    "firm",
    "secure"
  ],
  "sour": [
    "sweet",
    "sugary",
    "pleasant"
  ],
  "fresh": [
    "stale",
    "rotten",
    "spoiled",
    "old"
  ],
  "stale": [
    "fresh",
    "new",
    "crisp"
  ],
  "pure": [
    "impure",
    "contaminated",
    "polluted"
  ],
  "polluted": [
    "pure",
    "clean",
    "fresh",
    "uncontaminated"
  ],
  "correct": [
    "incorrect",
    "wrong",
    "false",
    "flawed"
  ],
  "incorrect": [
    "correct",
    "right",
    "accurate",
    "exact"
  ],
  "high": [
    "low",
    "short",
    "deep"
  ],
  "low": [
    "high",
    "tall",
    "elevated"
  ],
  "tall": [
    "short",
    "low",
    "petite"
  ],
  "short": [
    "tall",
    "long",
    "extended"
  ],
  "long": [
    "short",
    "brief",
    "curtailed"
  ],
  "smart": [
    "stupid",
    "foolish",
    "slow",
    "unintelligent"
  ],
  "stupid": [
    "smart",
    "clever",
    "intelligent",
    "bright"
  ],
  "clever": [
    "foolish",
    "clumsy",
    "naive",
    "simple"
  ],
  "awake": [
    "asleep",
    "sleeping",
    "drowsy"
  ],
  "asleep": [
    "awake",
    "alert",
    "conscious"
  ],
  "proud": [
    "humble",
    "modest",
    "ashamed"
  ],
  "humble": [
    "proud",
    "arrogant",
    "boastful"
  ],
  "arrogant": [
    "humble",
    "modest",
    "courteous"
  ],
  "modest": [
    "arrogant",
    "boastful",
    "immodest"
  ],
  "funny": [
    "serious",
    "somber",
    "grave",
    "solemn"
  ],
  "serious": [
    "funny",
    "playful",
    "lighthearted",
    "silly"
  ],
  "angry": [
    "calm",
    "peaceful",
    "pleased",
    "content"
  ],
  "excited": [
    "bored",
    "calm",
    "indifferent"
  ],
  "bored": [
    "excited",
    "interested",
    "enthusiastic"
  ],
  "straight": [
    "crooked",
    "curved",
    "bent",
    "twisted"
  ],
  "crooked": [
    "straight",
    "direct",
    "honest",
    "level"
  ],
  "broad": [
    "narrow",
    "tight",
    "restricted"
  ],
  "fat": [
    "thin",
    "skinny",
    "lean",
    "slender"
  ],
  "skinny": [
    "fat",
    "chubby",
    "plump",
    "heavy"
  ],
  "warm": [
    "cool",
    "chilly",
    "cold"
  ],
  "cool": [
    "warm",
    "heated",
    "hot"
  ],
  "sunny": [
    "cloudy",
    "rainy",
    "gloomy",
    "overcast"
  ],
  "cloudy": [
    "sunny",
    "clear",
    "bright"
  ],
  "equal": [
    "unequal",
    "different",
    "disparate"
  ],
  "unequal": [
    "equal",
    "identical",
    "even"
  ],
  "similar": [
    "different",
    "dissimilar",
    "distinct"
  ],
  "different": [
    "similar",
    "same",
    "identical",
    "alike"
  ],
  "same": [
    "different",
    "distinct",
    "other"
  ],
  "start": [
    "stop",
    "finish",
    "halt",
    "conclude"
  ],
  "stop": [
    "start",
    "continue",
    "resume",
    "proceed"
  ],
  "receive": [
    "give",
    "send",
    "deliver",
    "reject"
  ],
  "send": [
    "receive",
    "keep",
    "retain",
    "fetch"
  ],
  "grow": [
    "shrink",
    "wither",
    "diminish",
    "decline"
  ],
  "ascend": [
    "descend",
    "fall",
    "sink"
  ],
  "descend": [
    "ascend",
    "climb",
    "scale"
  ],
  "throw": [
    "catch",
    "hold",
    "keep"
  ],
  "show": [
    "hide",
    "conceal",
    "veil"
  ],
  "like": [
    "dislike",
    "hate",
    "resent"
  ],
  "dislike": [
    "like",
    "enjoy",
    "love"
  ],
  "agree": [
    "disagree",
    "dissent",
    "oppose",
    "argue"
  ],
  "disagree": [
    "agree",
    "concur",
    "consent",
    "harmonize"
  ],
  "admit": [
    "deny",
    "conceal",
    "hide",
    "reject"
  ],
  "deny": [
    "admit",
    "confirm",
    "acknowledge",
    "concede"
  ],
  "praise": [
    "criticize",
    "blame",
    "scold",
    "condemn"
  ],
  "criticize": [
    "praise",
    "applaud",
    "compliment",
    "commend"
  ],
  "reward": [
    "punish",
    "penalize",
    "fine"
  ],
  "punish": [
    "reward",
    "pardon",
    "forgive",
    "excuse"
  ],
  "encourage": [
    "discourage",
    "dissuade",
    "deter"
  ],
  "discourage": [
    "encourage",
    "inspire",
    "embolden"
  ],
  "include": [
    "exclude",
    "omit",
    "remove",
    "ignore"
  ],
  "exclude": [
    "include",
    "incorporate",
    "welcome",
    "contain"
  ],
  "enter": [
    "exit",
    "leave",
    "depart"
  ],
  "exit": [
    "enter",
    "arrive",
    "stay"
  ],
  "lock": [
    "unlock",
    "open",
    "release"
  ],
  "unlock": [
    "lock",
    "fasten",
    "secure"
  ],
  "live": [
    "die",
    "perish",
    "expire"
  ],
  "die": [
    "live",
    "survive",
    "resurrect"
  ],
  "sink": [
    "float",
    "rise",
    "soar"
  ],
  "float": [
    "sink",
    "submerge",
    "dive"
  ],
  "shout": [
    "whisper",
    "murmur",
    "mutter"
  ],
  "whisper": [
    "shout",
    "scream",
    "yell"
  ],
  "laugh": [
    "cry",
    "weep",
    "sob",
    "mourn"
  ],
  "cry": [
    "laugh",
    "smile",
    "cheer"
  ],
  "smile": [
    "frown",
    "scowl",
    "glare"
  ],
  "frown": [
    "smile",
    "grin",
    "beam"
  ],
  "trust": [
    "doubt",
    "distrust",
    "suspect"
  ],
  "doubt": [
    "trust",
    "believe",
    "credit"
  ],
  "advance": [
    "retreat",
    "recede",
    "withdraw"
  ],
  "retreat": [
    "advance",
    "proceed",
    "charge"
  ],
  "construct": [
    "demolish",
    "destroy",
    "wreck"
  ],
  "demolish": [
    "construct",
    "build",
    "create"
  ],
  "attract": [
    "repel",
    "repulse",
    "deter"
  ],
  "repel": [
    "attract",
    "draw",
    "invite"
  ],
  "unite": [
    "divide",
    "split",
    "separate"
  ],
  "divide": [
    "unite",
    "join",
    "combine"
  ],
  "friend": [
    "enemy",
    "foe",
    "rival",
    "opponent"
  ],
  "enemy": [
    "friend",
    "ally",
    "companion",
    "partner"
  ],
  "ally": [
    "enemy",
    "adversary",
    "rival"
  ],
  "truth": [
    "lie",
    "falsehood",
    "myth",
    "fiction"
  ],
  "lie": [
    "truth",
    "fact",
    "reality"
  ],
  "fact": [
    "fiction",
    "myth",
    "lie",
    "rumor"
  ],
  "fiction": [
    "fact",
    "nonfiction",
    "truth",
    "reality"
  ],
  "day": [
    "night",
    "darkness",
    "dusk"
  ],
  "night": [
    "day",
    "daylight",
    "dawn"
  ],
  "morning": [
    "evening",
    "night",
    "dusk"
  ],
  "evening": [
    "morning",
    "dawn",
    "daybreak"
  ],
  "sun": [
    "moon",
    "shadow"
  ],
  "moon": [
    "sun",
    "daylight"
  ],
  "heat": [
    "cold",
    "chill",
    "frost"
  ],
  "warmth": [
    "chill",
    "cold",
    "coolness"
  ],
  "summer": [
    "winter"
  ],
  "winter": [
    "summer"
  ],
  "birth": [
    "death",
    "demise",
    "end"
  ],
  "death": [
    "birth",
    "life",
    "creation"
  ],
  "life": [
    "death",
    "mortality",
    "extinction"
  ],
  "beginning": [
    "end",
    "conclusion",
    "finale"
  ],
  "success": [
    "failure",
    "defeat",
    "loss"
  ],
  "failure": [
    "success",
    "triumph",
    "achievement"
  ],
  "joy": [
    "sorrow",
    "grief",
    "sadness",
    "misery"
  ],
  "sorrow": [
    "joy",
    "happiness",
    "delight",
    "glee"
  ],
  "hope": [
    "despair",
    "hopelessness",
    "pessimism"
  ],
  "despair": [
    "hope",
    "optimism",
    "confidence"
  ],
  "strength": [
    "weakness",
    "frailty",
    "feebleness"
  ],
  "weakness": [
    "strength",
    "power",
    "vigor"
  ],
  "order": [
    "chaos",
    "disorder",
    "turmoil",
    "mess"
  ],
  "chaos": [
    "order",
    "peace",
    "structure",
    "system"
  ],
  "noise": [
    "silence",
    "quiet",
    "stillness",
    "calm"
  ],
  "silence": [
    "noise",
    "sound",
    "clamor",
    "racket"
  ]
};

function getStemCandidates(word) {
  const candidates = [word];
  if (word.endsWith('ies') && word.length > 4) candidates.push(word.slice(0, -3) + 'y');
  if (word.endsWith('es') && word.length > 3) candidates.push(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) candidates.push(word.slice(0, -1));

  if (word.endsWith('ing') && word.length > 4) {
    candidates.push(word.slice(0, -3));
    candidates.push(word.slice(0, -3) + 'e'); // e.g. vibrating -> vibrate
    if (/([^aeiou])\1ing$/.test(word)) candidates.push(word.slice(0, -4)); // running -> run
  }

  if (word.endsWith('ed') && word.length > 3) {
    candidates.push(word.slice(0, -2));
    candidates.push(word.slice(0, -1)); // e.g. alleviated -> alleviate
    if (/([^aeiou])\1ed$/.test(word)) candidates.push(word.slice(0, -3)); // stopped -> stop
  }

  if (word.endsWith('ly') && word.length > 3) candidates.push(word.slice(0, -2));
  if (word.endsWith('tion') && word.length > 5) {
    candidates.push(word.slice(0, -4) + 'te'); // accommodation -> accommodate
    candidates.push(word.slice(0, -4) + 't');
    candidates.push(word.slice(0, -4));
  }
  if (word.endsWith('ment') && word.length > 5) candidates.push(word.slice(0, -4));

  return Array.from(new Set(candidates));
}

/**
 * Clean dictionary definition text to make it simple and approachable
 */
function cleanDefinitionText(str) {
  if (!str) return '';
  return str
    .replace(/\([a-zA-Z0-9,\s\-\/;]+\)/g, '') // remove parenthetical tags like (countable, transitive)
    .replace(/^[a-z]+\t/i, '') // remove leading pos tag
    .replace(/\b(pertaining to|relating to|characterized by)\b/gi, 'about')
    .replace(/\b(denoting|signifying)\b/gi, 'meaning')
    .replace(/\b(in a manner that is)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^([a-z])/, (m, c) => c.toUpperCase());
}

/**
 * Query Datamuse high-speed API with strict 2.5s timeout
 */
async function fetchDatamuseDefinition(cleanWord) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const [defResp, synResp, antResp] = await Promise.all([
      fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(cleanWord)}&md=dp&max=1`, { signal: controller.signal }),
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleanWord)}&max=4`, { signal: controller.signal }).catch(() => null),
      fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(cleanWord)}&max=4`, { signal: controller.signal }).catch(() => null)
    ]);

    clearTimeout(timer);

    if (!defResp || !defResp.ok) return null;
    const defData = await defResp.json();

    if (Array.isArray(defData) && defData.length > 0 && defData[0].defs && defData[0].defs.length > 0) {
      const item = defData[0];
      const rawDef = item.defs[0];
      let pos = 'word';
      if (/^n\t/.test(rawDef)) pos = 'noun';
      else if (/^v\t/.test(rawDef)) pos = 'verb';
      else if (/^adj\t/.test(rawDef)) pos = 'adjective';
      else if (/^adv\t/.test(rawDef)) pos = 'adverb';

      let synonyms = [];
      if (synResp && synResp.ok) {
        const synData = await synResp.json();
        if (Array.isArray(synData)) {
          synonyms = synData.map(s => s.word).slice(0, 4);
        }
      }

      let antonyms = [];
      if (antResp && antResp.ok) {
        const antData = await antResp.json();
        if (Array.isArray(antData)) {
          antonyms = antData.map(a => a.word).slice(0, 4);
        }
      }

      let contextualDef = '';
      if (item.defs.length > 1) {
        contextualDef = 'In context: ' + cleanDefinitionText(item.defs[1]);
      } else {
        contextualDef = `In context: Used as a ${pos} when referring to ${item.word || cleanWord}.`;
      }

      return {
        word: item.defHeadword || item.word || cleanWord,
        pos,
        definition: cleanDefinitionText(rawDef),
        contextualDef,
        synonyms,
        antonyms,
        example: '',
        source: 'online'
      };
    }
  } catch (err) {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Query Free Dictionary API as secondary fallback with strict 2s timeout
 */
async function fetchFreeDictFallback(cleanWord) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2000);

  try {
    const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data[0]) {
        const first = data[0];
        const phonetic = first.phonetic || (first.phonetics && first.phonetics[0]?.text) || '';
        let pos = 'word';
        let def = '';
        let contextualDef = '';
        let example = '';
        const synonyms = [];
        const antonyms = [];

        if (first.meanings && first.meanings.length > 0) {
          const m = first.meanings[0];
          pos = m.partOfSpeech || 'word';
          if (m.definitions && m.definitions[0]) {
            def = cleanDefinitionText(m.definitions[0].definition);
            example = m.definitions[0].example || '';
            if (m.definitions[0].antonyms && m.definitions[0].antonyms.length > 0) {
              antonyms.push(...m.definitions[0].antonyms.slice(0, 4));
            }
          }
          if (m.definitions && m.definitions[1]) {
            contextualDef = 'In context: ' + cleanDefinitionText(m.definitions[1].definition);
          } else if (first.meanings[1] && first.meanings[1].definitions && first.meanings[1].definitions[0]) {
            contextualDef = `In context (${first.meanings[1].partOfSpeech || 'usage'}): ` + cleanDefinitionText(first.meanings[1].definitions[0].definition);
          }
          if (m.synonyms && m.synonyms.length > 0) {
            synonyms.push(...m.synonyms.slice(0, 4));
          }
          if (m.antonyms && m.antonyms.length > 0 && antonyms.length === 0) {
            antonyms.push(...m.antonyms.slice(0, 4));
          }
        }

        if (def) {
          return {
            word: first.word || cleanWord,
            pos,
            phonetic,
            definition: def,
            contextualDef: contextualDef || (example ? `In context: E.g., "${example}"` : ''),
            synonyms,
            antonyms,
            example,
            source: 'online'
          };
        }
      }
    }
  } catch (err) {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Main Lookup Entry Point:
 * 1. Checks local offline dictionary with smart stemming (0 ms, guaranteed).
 * 2. If online: queries high-speed Datamuse API (fast, reliable, <300ms).
 * 3. Falls back to Free Dictionary API if needed.
 * 4. Never hangs: returns clean, friendly fallback in under 2.5 seconds.
 */
async function lookupSimplifiedWord(inputWord) {
  if (!inputWord) return null;
  const clean = inputWord.toLowerCase().replace(/[^a-z0-9'-]/g, '').trim();
  if (!clean || clean.length < 2) return null;

  const stems = getStemCandidates(clean);

  // Helper to resolve antonyms from common offline list if empty
  const resolveAntonyms = (existingAntonyms = [], synonyms = []) => {
    if (existingAntonyms && existingAntonyms.length > 0) return existingAntonyms;
    for (const s of [clean, ...stems, ...(synonyms || [])]) {
      const lowerS = (s || '').toLowerCase();
      if (COMMON_OFFLINE_ANTONYMS[lowerS]) {
        return COMMON_OFFLINE_ANTONYMS[lowerS];
      }
    }
    return [];
  };

  // 1. Check offline curated dictionary with all stem variations
  for (const stem of stems) {
    if (SIMPLIFIED_OFFLINE_DB[stem]) {
      const entry = SIMPLIFIED_OFFLINE_DB[stem];
      const antonyms = resolveAntonyms(entry.antonyms, entry.synonyms);
      return {
        word: clean,
        rootWord: stem !== clean ? stem : '',
        pos: entry.pos,
        definition: entry.def,
        contextualDef: entry.context || '',
        synonyms: entry.synonyms || [],
        antonyms,
        example: entry.example || '',
        source: 'offline',
        phonetic: ''
      };
    }
  }

  // 2. Query online services if connected
  const isOnline = (typeof navigator === 'undefined' || navigator.onLine !== false) &&
    (typeof window === 'undefined' || window.vaIsOnline !== false);
  if (isOnline) {
    // Try Datamuse first (fastest and most reliable)
    for (const wordToTry of [clean, ...stems.slice(1, 3)]) {
      const result = await fetchDatamuseDefinition(wordToTry);
      if (result) {
        result.antonyms = resolveAntonyms(result.antonyms, result.synonyms);
        return result;
      }
    }

    // Try secondary dictionary API
    const fallbackResult = await fetchFreeDictFallback(clean);
    if (fallbackResult) {
      fallbackResult.antonyms = resolveAntonyms(fallbackResult.antonyms, fallbackResult.synonyms);
      return fallbackResult;
    }
  }

  // 3. Check if word itself exists in common offline antonyms map even if definition is missing
  const commonAnts = resolveAntonyms();
  if (commonAnts.length > 0) {
    return {
      word: clean,
      pos: 'word',
      definition: `A widely used word representing ${clean}.`,
      contextualDef: `In context: Commonly contrasted with its opposites: ${commonAnts.slice(0, 3).join(', ')}.`,
      synonyms: [],
      antonyms: commonAnts,
      example: '',
      source: 'offline'
    };
  }

  // 4. Instant clean fallback if not found (never hangs!)
  return {
    word: clean,
    pos: 'term',
    definition: isOnline
      ? `A simple definition for "${clean}" was not found. Try searching for its root form.`
      : `You are in Offline Mode and "${clean}" is not stored in the offline dictionary cache.`,
    contextualDef: '',
    synonyms: [],
    antonyms: [],
    example: '',
    source: isOnline ? 'not_found' : 'offline_missing'
  };
}

// Universal export for service workers, window, and node
if (typeof self !== 'undefined') {
  self.SIMPLIFIED_OFFLINE_DB = SIMPLIFIED_OFFLINE_DB;
  self.COMMON_OFFLINE_ANTONYMS = COMMON_OFFLINE_ANTONYMS;
  self.lookupSimplifiedWord = lookupSimplifiedWord;
}
if (typeof window !== 'undefined') {
  window.SIMPLIFIED_OFFLINE_DB = SIMPLIFIED_OFFLINE_DB;
  window.COMMON_OFFLINE_ANTONYMS = COMMON_OFFLINE_ANTONYMS;
  window.lookupSimplifiedWord = lookupSimplifiedWord;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SIMPLIFIED_OFFLINE_DB, COMMON_OFFLINE_ANTONYMS, lookupSimplifiedWord, getStemCandidates, cleanDefinitionText };
}
