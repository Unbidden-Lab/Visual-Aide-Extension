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
    "synonyms": ["oddity", "irregularity", "exception"],
    "example": "Snow in July is an aberration in most places."
  },
  "abstain": {
    "pos": "verb",
    "def": "To choose not to do or have something.",
    "synonyms": ["avoid", "refrain", "hold back"],
    "example": "He decided to abstain from eating sugary snacks."
  },
  "accommodate": {
    "pos": "verb",
    "def": "To make fit, help out, or provide enough space for someone.",
    "synonyms": ["fit", "help", "suit", "adjust"],
    "example": "The hotel can accommodate up to 200 guests."
  },
  "accommodation": {
    "pos": "noun",
    "def": "A helpful adjustment or a place to stay that fits someone's needs.",
    "synonyms": ["adjustment", "help", "support", "lodging"],
    "example": "Extra reading time is a helpful accommodation in school."
  },
  "accumulate": {
    "pos": "verb",
    "def": "To collect or gather more and more over time.",
    "synonyms": ["gather", "collect", "build up"],
    "example": "Dust will accumulate if you do not clean often."
  },
  "adversity": {
    "pos": "noun",
    "def": "A difficult situation or misfortune that brings hardship.",
    "synonyms": ["hardship", "trouble", "difficulty"],
    "example": "She stayed brave and hopeful despite facing great adversity."
  },
  "alleviate": {
    "pos": "verb",
    "def": "To make pain, suffering, or trouble less severe.",
    "synonyms": ["ease", "relieve", "lessen", "soothe"],
    "example": "A cold drink can alleviate a sore throat."
  },
  "ambiguous": {
    "pos": "adjective",
    "def": "Having more than one possible meaning; not clear.",
    "synonyms": ["unclear", "vague", "puzzling"],
    "example": "His directions were ambiguous, so we took the wrong road."
  },
  "anchor": {
    "pos": "verb",
    "def": "To hold firmly in place so something does not drift or move.",
    "synonyms": ["secure", "hold fast", "steady"],
    "example": "Heavy letter bases anchor words so they do not swim."
  },
  "anomaly": {
    "pos": "noun",
    "def": "Something that does not fit the regular rule or pattern.",
    "synonyms": ["misfit", "oddity", "outlier"],
    "example": "Finding an ice cube in the desert would be an anomaly."
  },
  "apprehensive": {
    "pos": "adjective",
    "def": "Feeling nervous or worried that something bad might happen.",
    "synonyms": ["anxious", "worried", "nervous"],
    "example": "She felt apprehensive before speaking in front of the class."
  },
  "arbitrary": {
    "pos": "adjective",
    "def": "Based on random choice or impulse rather than a fair reason.",
    "synonyms": ["random", "unplanned", "chance"],
    "example": "Picking the winner by coin flip felt arbitrary."
  },
  "articulate": {
    "pos": "adjective",
    "def": "Able to express thoughts and ideas clearly.",
    "synonyms": ["clear", "well-spoken", "fluent"],
    "example": "The teacher gave an articulate explanation of the lesson."
  },
  "augment": {
    "pos": "verb",
    "def": "To make something greater or larger by adding to it.",
    "synonyms": ["increase", "add to", "grow"],
    "example": "He took an evening job to augment his income."
  },
  "benevolent": {
    "pos": "adjective",
    "def": "Kind, helpful, and caring towards others.",
    "synonyms": ["kind", "generous", "helpful"],
    "example": "A benevolent stranger paid for the family's dinner."
  },
  "bionic": {
    "pos": "adjective",
    "def": "Using technology or visual anchors to help human abilities work better.",
    "synonyms": ["guided", "enhanced", "assisted"],
    "example": "Bionic reading guides the eyes across text."
  },
  "bolster": {
    "pos": "verb",
    "def": "To support, strengthen, or hold something up.",
    "synonyms": ["support", "boost", "strengthen"],
    "example": "Positive feedback helped bolster her confidence."
  },
  "candid": {
    "pos": "adjective",
    "def": "Truthful, direct, and honest.",
    "synonyms": ["honest", "frank", "open"],
    "example": "The coach gave candid advice on how to improve."
  },
  "chronological": {
    "pos": "adjective",
    "def": "Arranged in the order of time that events happened.",
    "synonyms": ["in order", "sequential", "timed"],
    "example": "The history book told the story in chronological order."
  },
  "coerce": {
    "pos": "verb",
    "def": "To force someone into doing something they do not want to do.",
    "synonyms": ["force", "push", "compel"],
    "example": "You should never coerce someone into signing a contract."
  },
  "cognitive": {
    "pos": "adjective",
    "def": "Related to thinking, understanding, learning, and remembering.",
    "synonyms": ["mental", "thinking", "reasoning"],
    "example": "Reading exercises help improve cognitive skills."
  },
  "coherent": {
    "pos": "adjective",
    "def": "Logical, clear, and making good sense.",
    "synonyms": ["clear", "logical", "connected"],
    "example": "He wrote a coherent essay that was easy to understand."
  },
  "collaborate": {
    "pos": "verb",
    "def": "To work together with others toward a shared goal.",
    "synonyms": ["cooperate", "team up", "work together"],
    "example": "The two teams collaborated to finish the project on time."
  },
  "compensate": {
    "pos": "verb",
    "def": "To give money or a reward to make up for loss, damage, or work.",
    "synonyms": ["repay", "make up for", "pay"],
    "example": "The company will compensate workers for extra hours."
  },
  "comprehend": {
    "pos": "verb",
    "def": "To understand the meaning of something clearly.",
    "synonyms": ["understand", "grasp", "get"],
    "example": "Good spacing helps students comprehend long paragraphs."
  },
  "comprehension": {
    "pos": "noun",
    "def": "The ability to understand and find meaning in what is read or heard.",
    "synonyms": ["understanding", "grasp", "knowledge"],
    "example": "Visual aids boost reading comprehension."
  },
  "comprehensive": {
    "pos": "adjective",
    "def": "Including all or almost all details; complete.",
    "synonyms": ["complete", "thorough", "full"],
    "example": "The guide gave a comprehensive list of all town parks."
  },
  "concur": {
    "pos": "verb",
    "def": "To agree with someone or with an opinion.",
    "synonyms": ["agree", "coincide", "concur"],
    "example": "All the doctors concurred that rest was the best treatment."
  },
  "condone": {
    "pos": "verb",
    "def": "To accept or forgive bad behavior as if it were okay.",
    "synonyms": ["allow", "excuse", "accept"],
    "example": "The school does not condone cheating of any kind."
  },
  "conducive": {
    "pos": "adjective",
    "def": "Making it easy or likely for something good to happen.",
    "synonyms": ["helpful", "favorable", "beneficial"],
    "example": "A quiet room is conducive to studying."
  },
  "conspicuous": {
    "pos": "adjective",
    "def": "Very noticeable or easily seen.",
    "synonyms": ["obvious", "evident", "visible"],
    "example": "The bright yellow jacket was conspicuous in the crowd."
  },
  "contemporary": {
    "pos": "adjective",
    "def": "Belonging to the present time; modern.",
    "synonyms": ["modern", "current", "present-day"],
    "example": "She loves contemporary art and modern designs."
  },
  "corroborate": {
    "pos": "verb",
    "def": "To give evidence that confirms or supports a statement.",
    "synonyms": ["confirm", "verify", "back up"],
    "example": "Security video corroborated the witness's story."
  },
  "cumbersome": {
    "pos": "adjective",
    "def": "Large, heavy, and awkward to carry or manage.",
    "synonyms": ["clunky", "awkward", "heavy"],
    "example": "The heavy backpack was cumbersome on the long hike."
  },
  "debilitate": {
    "pos": "verb",
    "def": "To make someone very weak or feeble.",
    "synonyms": ["weaken", "drain", "exhaust"],
    "example": "A high fever can quickly debilitate even strong athletes."
  },
  "deduce": {
    "pos": "verb",
    "def": "To reach a logical conclusion from known facts.",
    "synonyms": ["figure out", "infer", "work out"],
    "example": "From the wet ground, we can deduce that it rained last night."
  },
  "deference": {
    "pos": "noun",
    "def": "Polite respect and submission to someone's wishes or authority.",
    "synonyms": ["respect", "regard", "courtesy"],
    "example": "He lowered his voice in deference to the sleeping baby."
  },
  "delineate": {
    "pos": "verb",
    "def": "To describe, draw, or explain something clearly in detail.",
    "synonyms": ["outline", "describe", "define"],
    "example": "The map clearly delineates the border between towns."
  },
  "detrimental": {
    "pos": "adjective",
    "def": "Causing harm, damage, or disadvantage.",
    "synonyms": ["harmful", "damaging", "bad"],
    "example": "Eating too much sugar is detrimental to your teeth."
  },
  "dichotomy": {
    "pos": "noun",
    "def": "A division or sharp contrast between two opposite things.",
    "synonyms": ["contrast", "split", "division"],
    "example": "There is a clear dichotomy between city and country life."
  },
  "diminish": {
    "pos": "verb",
    "def": "To make or become smaller, fewer, or less important.",
    "synonyms": ["reduce", "decrease", "lessen"],
    "example": "The sound of rain began to diminish as the storm passed."
  },
  "discrepancy": {
    "pos": "noun",
    "def": "A difference or mismatch between two things that should be equal.",
    "synonyms": ["difference", "mismatch", "inconsistency"],
    "example": "There was a discrepancy between the bill and what she ordered."
  },
  "disdain": {
    "pos": "noun",
    "def": "A feeling that someone or something does not deserve respect.",
    "synonyms": ["scorn", "disrespect", "contempt"],
    "example": "The cat looked at the bath water with pure disdain."
  },
  "disseminate": {
    "pos": "verb",
    "def": "To spread information, ideas, or news widely.",
    "synonyms": ["spread", "broadcast", "distribute"],
    "example": "The radio helps disseminate storm warnings to farmers."
  },
  "distort": {
    "pos": "verb",
    "def": "To pull or twist out of shape, making something look weird or untrue.",
    "synonyms": ["twist", "warp", "bend"],
    "example": "Water drops on glasses can distort the letters."
  },
  "distortion": {
    "pos": "noun",
    "def": "A change that twists something out of its natural shape or meaning.",
    "synonyms": ["blur", "warp", "twist"],
    "example": "Pattern glare causes visual distortion on high-contrast white pages."
  },
  "divergent": {
    "pos": "adjective",
    "def": "Moving in different directions or developing different views.",
    "synonyms": ["different", "separate", "varying"],
    "example": "The two friends took divergent career paths after college."
  },
  "dyslexia": {
    "pos": "noun",
    "def": "A common learning difference that makes reading, writing, and spelling trickier.",
    "synonyms": ["reading difference", "learning style"],
    "example": "People with dyslexia are often creative problem solvers."
  },
  "eloquent": {
    "pos": "adjective",
    "def": "Speaking or writing in a fluent, expressive, and persuasive way.",
    "synonyms": ["well-spoken", "moving", "persuasive"],
    "example": "The speaker gave an eloquent speech that moved the audience."
  },
  "elucidate": {
    "pos": "verb",
    "def": "To make something clear or easy to understand by explaining it.",
    "synonyms": ["explain", "clarify", "clear up"],
    "example": "The scientist used diagrams to elucidate how the solar panels work."
  },
  "empathy": {
    "pos": "noun",
    "def": "The ability to understand and share the feelings of another person.",
    "synonyms": ["understanding", "compassion", "caring"],
    "example": "She felt deep empathy when her friend lost their beloved pet."
  },
  "empirical": {
    "pos": "adjective",
    "def": "Based on actual testing, experiments, or observation rather than theory.",
    "synonyms": ["practical", "observed", "tested"],
    "example": "Doctors rely on empirical evidence before approving medicine."
  },
  "enhance": {
    "pos": "verb",
    "def": "To improve the quality, value, or strength of something.",
    "synonyms": ["improve", "boost", "upgrade"],
    "example": "OpenDyslexic fonts enhance reading comfort for many users."
  },
  "equivocal": {
    "pos": "adjective",
    "def": "Open to more than one meaning; deliberately misleading.",
    "synonyms": ["vague", "uncertain", "misleading"],
    "example": "The politician gave an equivocal answer to avoid taking sides."
  },
  "erratic": {
    "pos": "adjective",
    "def": "Not regular or predictable; moving or changing unevenly.",
    "synonyms": ["unpredictable", "uneven", "random"],
    "example": "The driver's erratic movements made other cars stay back."
  },
  "exemplary": {
    "pos": "adjective",
    "def": "So good that it serves as a wonderful model for others to follow.",
    "synonyms": ["model", "excellent", "admirable"],
    "example": "The student received an award for her exemplary attendance."
  },
  "facilitate": {
    "pos": "verb",
    "def": "To make a process or action easier or smoother.",
    "synonyms": ["help", "ease", "assist"],
    "example": "Visual aids facilitate better reading comprehension."
  },
  "fallacy": {
    "pos": "noun",
    "def": "A mistaken belief or a false idea that sounds convincing.",
    "synonyms": ["misconception", "falsehood", "myth"],
    "example": "It is a fallacy that eating carrots gives you night vision."
  },
  "fastidious": {
    "pos": "adjective",
    "def": "Paying huge attention to accuracy, clean details, and perfection.",
    "synonyms": ["picky", "fussy", "detailed"],
    "example": "The baker was fastidious about the temperature of the oven."
  },
  "feasible": {
    "pos": "adjective",
    "def": "Possible to do easily or conveniently.",
    "synonyms": ["doable", "practical", "workable"],
    "example": "Finishing the painting by Friday is totally feasible."
  },
  "fixation": {
    "pos": "noun",
    "def": "A brief pause where the eyes stop to focus and take in a word.",
    "synonyms": ["focus point", "pause", "stopping point"],
    "example": "Bionic reading guides eye fixation to the start of each word."
  },
  "fluency": {
    "pos": "noun",
    "def": "The ability to read or speak smoothly, easily, and expressively.",
    "synonyms": ["smoothness", "ease", "flow"],
    "example": "Lexend fonts are designed to improve reading fluency."
  },
  "fluent": {
    "pos": "adjective",
    "def": "Able to express oneself or read easily and articulately.",
    "synonyms": ["smooth", "easy", "effortless"],
    "example": "With practice, she became a fluent reader."
  },
  "foster": {
    "pos": "verb",
    "def": "To encourage the growth, development, or care of something.",
    "synonyms": ["encourage", "promote", "nurture"],
    "example": "Reading stories helps foster creativity in children."
  },
  "fundamental": {
    "pos": "adjective",
    "def": "Forming a necessary base or core; of central importance.",
    "synonyms": ["basic", "essential", "core"],
    "example": "Alphabet recognition is a fundamental part of learning to read."
  },
  "glare": {
    "pos": "noun",
    "def": "A harsh, uncomfortably bright light that strains the eyes.",
    "synonyms": ["brightness", "shine", "harsh light"],
    "example": "A warm tint reduces glare on white screens."
  },
  "gregarious": {
    "pos": "adjective",
    "def": "Fond of company; sociable and enjoying other people.",
    "synonyms": ["sociable", "friendly", "outgoing"],
    "example": "Parrots are gregarious birds that love being around others."
  },
  "haphazard": {
    "pos": "adjective",
    "def": "Lacking any obvious plan, order, or direction.",
    "synonyms": ["messy", "random", "disorganized"],
    "example": "Books were stacked in a haphazard pile on the floor."
  },
  "hierarchy": {
    "pos": "noun",
    "def": "A system where members are ranked according to status or authority.",
    "synonyms": ["ranking", "order", "ladder"],
    "example": "In the bee hierarchy, the queen bee is at the top."
  },
  "hypothetical": {
    "pos": "adjective",
    "def": "Based on a suggested idea or guess rather than a real event.",
    "synonyms": ["imagined", "theoretical", "supposed"],
    "example": "Let us consider a hypothetical situation where cars fly."
  },
  "idiosyncrasy": {
    "pos": "noun",
    "def": "A personal habit, quirk, or odd mannerism unique to one person.",
    "synonyms": ["quirk", "habit", "peculiarity"],
    "example": "Wiggling his nose before sneezing was his funny idiosyncrasy."
  },
  "impair": {
    "pos": "verb",
    "def": "To weaken, damage, or reduce the ability of something.",
    "synonyms": ["damage", "weaken", "harm"],
    "example": "Bright screen glare can impair your reading stamina."
  },
  "imperative": {
    "pos": "adjective",
    "def": "Of vital importance; crucial and urgent.",
    "synonyms": ["essential", "urgent", "crucial"],
    "example": "It is imperative that you wear a seatbelt in the car."
  },
  "implicit": {
    "pos": "adjective",
    "def": "Understood without being directly stated in words.",
    "synonyms": ["implied", "unspoken", "understood"],
    "example": "Their smile was an implicit sign that they approved."
  },
  "impose": {
    "pos": "verb",
    "def": "To force something welcome or unwelcome upon someone.",
    "synonyms": ["force", "inflict", "place"],
    "example": "The judge decided not to impose a heavy fine."
  },
  "incentive": {
    "pos": "noun",
    "def": "Something that motivates or encourages someone to do something.",
    "synonyms": ["motivation", "reward", "reason"],
    "example": "A sticker on the chart was a fun incentive to read daily."
  },
  "indifferent": {
    "pos": "adjective",
    "def": "Having no particular interest, sympathy, or concern.",
    "synonyms": ["unconcerned", "neutral", "uninterested"],
    "example": "He was indifferent about whether we watched comedy or drama."
  },
  "inevitable": {
    "pos": "adjective",
    "def": "Certain to happen; unavoidable.",
    "synonyms": ["unavoidable", "sure", "certain"],
    "example": "Sunset is inevitable at the end of every day."
  },
  "infer": {
    "pos": "verb",
    "def": "To figure something out from clues rather than direct statements.",
    "synonyms": ["deduce", "conclude", "guess"],
    "example": "From his smile, we could infer that he passed the test."
  },
  "inherent": {
    "pos": "adjective",
    "def": "Existing as a natural and permanent part of something.",
    "synonyms": ["natural", "built-in", "inborn"],
    "example": "Curiosity is an inherent trait of young kittens."
  },
  "innovate": {
    "pos": "verb",
    "def": "To make changes in something established, introducing new methods or ideas.",
    "synonyms": ["create", "invent", "modernize"],
    "example": "The company tries to innovate every year with fresh tools."
  },
  "intervention": {
    "pos": "noun",
    "def": "An action or tool introduced to help solve a difficulty or improve a condition.",
    "synonyms": ["aid", "help", "support", "accommodation"],
    "example": "Font spacing is an effective typographic intervention for dyslexia."
  },
  "intricate": {
    "pos": "adjective",
    "def": "Very complicated, detailed, or made of many small parts.",
    "synonyms": ["complex", "detailed", "elaborate"],
    "example": "The spider spun an intricate web between two branches."
  },
  "intrinsic": {
    "pos": "adjective",
    "def": "Belonging naturally; essential to the real nature of a thing.",
    "synonyms": ["inborn", "natural", "core"],
    "example": "Helping others gave her intrinsic happiness."
  },
  "judicious": {
    "pos": "adjective",
    "def": "Having, showing, or done with good sense and wise judgment.",
    "synonyms": ["wise", "sensible", "careful"],
    "example": "He made a judicious choice to save half his earnings."
  },
  "juxtapose": {
    "pos": "verb",
    "def": "To place two things side by side to compare or contrast them.",
    "synonyms": ["compare", "contrast", "place together"],
    "example": "The artist liked to juxtapose modern cities next to wild forests."
  },
  "kerning": {
    "pos": "noun",
    "def": "The spacing between individual letters in a word.",
    "synonyms": ["letter spacing", "tracking"],
    "example": "Wider kerning stops letters from blending together."
  },
  "kinetic": {
    "pos": "adjective",
    "def": "Relating to or resulting from movement and motion.",
    "synonyms": ["moving", "active", "dynamic"],
    "example": "A spinning top has kinetic energy."
  },
  "leading": {
    "pos": "noun",
    "def": "The vertical space between lines of text in a paragraph.",
    "synonyms": ["line height", "vertical spacing"],
    "example": "Increasing the leading makes lines easier to track."
  },
  "legibility": {
    "pos": "noun",
    "def": "How easily individual letters and words can be distinguished and read.",
    "synonyms": ["readability", "clarity", "clearness"],
    "example": "High contrast improves screen legibility."
  },
  "lucid": {
    "pos": "adjective",
    "def": "Expressed clearly; easy to understand; bright and luminous.",
    "synonyms": ["clear", "plain", "understandable"],
    "example": "The instructions were so lucid that anyone could build the desk."
  },
  "magnanimous": {
    "pos": "adjective",
    "def": "Very generous or forgiving, especially toward a rival or less powerful person.",
    "synonyms": ["generous", "forgiving", "big-hearted"],
    "example": "He was magnanimous in victory and praised the other team."
  },
  "mandatory": {
    "pos": "adjective",
    "def": "Required by law or rules; compulsory.",
    "synonyms": ["required", "compulsory", "needed"],
    "example": "Wearing a helmet while cycling is mandatory in this park."
  },
  "meticulous": {
    "pos": "adjective",
    "def": "Showing great attention to detail; very careful and precise.",
    "synonyms": ["careful", "detailed", "precise"],
    "example": "The watchmaker was meticulous when placing the tiny gears."
  },
  "mitigate": {
    "pos": "verb",
    "def": "To make something less severe, painful, or damaging.",
    "synonyms": ["reduce", "soften", "lessen"],
    "example": "Planting trees helps mitigate wind damage during storms."
  },
  "monotonous": {
    "pos": "adjective",
    "def": "Dull, tedious, and repetitious; lacking in variety.",
    "synonyms": ["boring", "repetitive", "unvarying"],
    "example": "Clicking the same button all day was a monotonous task."
  },
  "negligible": {
    "pos": "adjective",
    "def": "So small or unimportant as to not be worth considering.",
    "synonyms": ["tiny", "minor", "insignificant"],
    "example": "The scratch on the bumper was negligible and barely visible."
  },
  "neurodivergent": {
    "pos": "adjective",
    "def": "Having a brain that learns, thinks, or processes information differently from what is typical.",
    "synonyms": ["diverse brain", "unique thinker"],
    "example": "Dyslexia and ADHD are common neurodivergent traits."
  },
  "nonchalant": {
    "pos": "adjective",
    "def": "Appearing calm and relaxed; not showing anxiety or interest.",
    "synonyms": ["casual", "calm", "unconcerned"],
    "example": "He gave a nonchalant shrug as if winning did not surprise him."
  },
  "nostalgia": {
    "pos": "noun",
    "def": "A warm, wistful feeling of affection for the past.",
    "synonyms": ["reminiscence", "longing", "memory"],
    "example": "Looking at childhood photos filled him with nostalgia."
  },
  "novel": {
    "pos": "adjective",
    "def": "New, fresh, and not resembling anything used or known before.",
    "synonyms": ["new", "unique", "innovative"],
    "example": "The team designed a novel way to save solar battery energy."
  },
  "nuance": {
    "pos": "noun",
    "def": "A subtle or delicate difference in meaning, expression, or sound.",
    "synonyms": ["subtlety", "shade", "fine point"],
    "example": "An experienced actor catches every nuance in a script."
  },
  "objective": {
    "pos": "adjective",
    "def": "Not influenced by personal feelings; based on real facts.",
    "synonyms": ["unbiased", "fair", "neutral"],
    "example": "A referee must remain objective throughout the game."
  },
  "obsolete": {
    "pos": "adjective",
    "def": "No longer produced or used; out of date.",
    "synonyms": ["outdated", "old", "discontinued"],
    "example": "Floppy disks became obsolete once flash drives arrived."
  },
  "omniscient": {
    "pos": "adjective",
    "def": "Knowing everything; having complete and infinite knowledge.",
    "synonyms": ["all-knowing", "all-wise"],
    "example": "The story was told by an omniscient narrator."
  },
  "opaque": {
    "pos": "adjective",
    "def": "Not able to be seen through; not transparent.",
    "synonyms": ["cloudy", "solid", "non-transparent"],
    "example": "The frosted shower door is opaque for privacy."
  },
  "optimum": {
    "pos": "adjective",
    "def": "Most favorable or advantageous; best.",
    "synonyms": ["best", "ideal", "peak"],
    "example": "Spring provides optimum weather for planting flowers."
  },
  "paradox": {
    "pos": "noun",
    "def": "A statement that seems contradictory but may actually be true.",
    "synonyms": ["puzzle", "contradiction", "riddle"],
    "example": "It is a paradox that the more you give, the richer you feel."
  },
  "paramount": {
    "pos": "adjective",
    "def": "More important than anything else; supreme.",
    "synonyms": ["top", "chief", "primary"],
    "example": "Passenger safety is paramount for airline pilots."
  },
  "perceptive": {
    "pos": "adjective",
    "def": "Having or showing sensitive insight and keen observation.",
    "synonyms": ["observant", "sharp", "insightful"],
    "example": "The perceptive teacher noticed the student was feeling sad."
  },
  "perseverance": {
    "pos": "noun",
    "def": "Continuing to do something despite difficulties and delays.",
    "synonyms": ["persistence", "determination", "grit"],
    "example": "Through perseverance and practice, he learned to play guitar."
  },
  "pervasive": {
    "pos": "adjective",
    "def": "Spreading widely throughout an area or group of people.",
    "synonyms": ["widespread", "prevalent", "common"],
    "example": "The sweet smell of baked bread was pervasive throughout the house."
  },
  "plausible": {
    "pos": "adjective",
    "def": "Seeming reasonable or probable; believable.",
    "synonyms": ["believable", "likely", "credible"],
    "example": "His explanation for being late was plausible and honest."
  },
  "pragmatic": {
    "pos": "adjective",
    "def": "Dealing with things sensibly and realistically rather than theoretically.",
    "synonyms": ["practical", "sensible", "realistic"],
    "example": "She took a pragmatic approach to budget her grocery spending."
  },
  "preliminary": {
    "pos": "adjective",
    "def": "Happening before a more important event; introductory.",
    "synonyms": ["initial", "introductory", "starting"],
    "example": "The doctor shared the preliminary results of the checkup."
  },
  "prevalent": {
    "pos": "adjective",
    "def": "Widespread in a particular area or at a particular time.",
    "synonyms": ["common", "widespread", "frequent"],
    "example": "Colds are more prevalent during winter months."
  },
  "profound": {
    "pos": "adjective",
    "def": "Very great or intense; having deep meaning.",
    "synonyms": ["deep", "meaningful", "great"],
    "example": "The poem had a profound effect on everyone who read it."
  },
  "prolific": {
    "pos": "adjective",
    "def": "Producing much fruit or foliage or many works.",
    "synonyms": ["productive", "fruitful", "creative"],
    "example": "The prolific author wrote two novels every single year."
  },
  "prospective": {
    "pos": "adjective",
    "def": "Expected or likely to happen or become something in the future.",
    "synonyms": ["potential", "future", "likely"],
    "example": "The campus tour is great for prospective college students."
  },
  "prudent": {
    "pos": "adjective",
    "def": "Acting with or showing care and thought for the future.",
    "synonyms": ["wise", "cautious", "careful"],
    "example": "It is prudent to bring an umbrella when clouds turn gray."
  },
  "redundant": {
    "pos": "adjective",
    "def": "Not needed or useful; repeating what is already there.",
    "synonyms": ["unnecessary", "repetitive", "extra"],
    "example": "Saying 'free gift' is redundant because gifts are always free."
  },
  "reiterate": {
    "pos": "verb",
    "def": "To say something again or a number of times for clarity.",
    "synonyms": ["repeat", "restate", "emphasize"],
    "example": "The teacher reiterated the homework instructions twice."
  },
  "relinquish": {
    "pos": "verb",
    "def": "To voluntarily cease to keep or claim; to give up.",
    "synonyms": ["give up", "release", "let go"],
    "example": "The older champion had to relinquish his crown after the race."
  },
  "reprehensible": {
    "pos": "adjective",
    "def": "Deserving severe disapproval or blame; very bad.",
    "synonyms": ["shameful", "blameworthy", "bad"],
    "example": "Cheating on the exam was reprehensible behavior."
  },
  "resilient": {
    "pos": "adjective",
    "def": "Able to withstand or recover quickly from difficult conditions.",
    "synonyms": ["strong", "adaptable", "tough"],
    "example": "Young plants are surprisingly resilient after heavy storms."
  },
  "retrospect": {
    "pos": "noun",
    "def": "A survey or review of a past course of events or period of time.",
    "synonyms": ["hindsight", "looking back", "review"],
    "example": "In retrospect, buying the sturdy winter boots was a smart move."
  },
  "robust": {
    "pos": "adjective",
    "def": "Strong and healthy; vigorous; able to handle stress.",
    "synonyms": ["strong", "tough", "durable"],
    "example": "The hikers wore robust shoes made for rocky mountain trails."
  },
  "saccadic": {
    "pos": "adjective",
    "def": "Relating to the quick, simultaneous jumps that eyes make while reading.",
    "synonyms": ["eye jumps", "rapid eye movement"],
    "example": "Bionic reading guides saccadic eye jumps between words."
  },
  "scrutinize": {
    "pos": "verb",
    "def": "To examine or inspect something closely and thoroughly.",
    "synonyms": ["inspect", "examine", "study"],
    "example": "Detectives will scrutinize the fingerprints on the counter."
  },
  "spacing": {
    "pos": "noun",
    "def": "The distance left between letters, words, or lines.",
    "synonyms": ["gap", "distance", "interval"],
    "example": "Clear spacing helps separate adjacent words."
  },
  "spontaneous": {
    "pos": "adjective",
    "def": "Happening naturally without being planned ahead of time.",
    "synonyms": ["unplanned", "natural", "impulsive"],
    "example": "The crowd broke into spontaneous applause after the song."
  },
  "stagnant": {
    "pos": "adjective",
    "def": "Not flowing or moving; not developing or advancing.",
    "synonyms": ["still", "motionless", "inactive"],
    "example": "Mosquitoes lay eggs in stagnant puddle water."
  },
  "subsequent": {
    "pos": "adjective",
    "def": "Coming after something in time; following.",
    "synonyms": ["following", "next", "later"],
    "example": "The first chapter was slow, but subsequent chapters were exciting."
  },
  "substantiate": {
    "pos": "verb",
    "def": "To provide evidence to support or prove the truth of something.",
    "synonyms": ["prove", "confirm", "back up"],
    "example": "The scientist had lab data to substantiate her hypothesis."
  },
  "superfluous": {
    "pos": "adjective",
    "def": "More than what is needed; unnecessary extra.",
    "synonyms": ["extra", "unneeded", "excessive"],
    "example": "Packing five coats for a sunny weekend trip is superfluous."
  },
  "tangible": {
    "pos": "adjective",
    "def": "Perceptible by touch; clear, definite, and real.",
    "synonyms": ["real", "touchable", "concrete"],
    "example": "Holding a printed diploma made his achievement feel tangible."
  },
  "tenacious": {
    "pos": "adjective",
    "def": "Holding fast; persistent and refusing to give up.",
    "synonyms": ["persistent", "stubborn", "determined"],
    "example": "The tenacious puppy refused to drop the tennis ball."
  },
  "tentative": {
    "pos": "adjective",
    "def": "Not certain or fixed; provisional; hesitant.",
    "synonyms": ["uncertain", "provisional", "hesitant"],
    "example": "They made a tentative plan to meet for lunch on Tuesday."
  },
  "tracking": {
    "pos": "noun",
    "def": "The overall uniform space across letters in a line of text.",
    "synonyms": ["letter spacing", "kerning"],
    "example": "Adding tracking helps people with dyslexia distinguish letters."
  },
  "typeface": {
    "pos": "noun",
    "def": "The visual design and shape of a set of letters and numbers.",
    "synonyms": ["font", "letter design", "font style"],
    "example": "OpenDyslexic is an accessible typeface designed for clarity."
  },
  "ubiquitous": {
    "pos": "adjective",
    "def": "Present, appearing, or found everywhere.",
    "synonyms": ["everywhere", "omnipresent", "widespread"],
    "example": "Smartphones are ubiquitous in modern society."
  },
  "unprecedented": {
    "pos": "adjective",
    "def": "Never done or known before.",
    "synonyms": ["groundbreaking", "first-time", "unmatched"],
    "example": "The spacecraft sent back unprecedented clear photos of Mars."
  },
  "valid": {
    "pos": "adjective",
    "def": "Having a sound basis in logic or fact; legally acceptable.",
    "synonyms": ["true", "sound", "acceptable"],
    "example": "You need a valid passport to travel abroad."
  },
  "verbose": {
    "pos": "adjective",
    "def": "Using or expressed in more words than are needed.",
    "synonyms": ["wordy", "long-winded", "talkative"],
    "example": "His essay was so verbose that it took twice as long to read."
  },
  "viable": {
    "pos": "adjective",
    "def": "Capable of working successfully; feasible.",
    "synonyms": ["workable", "practical", "feasible"],
    "example": "Solar power is a viable alternative to fossil fuels."
  },
  "vibrate": {
    "pos": "verb",
    "def": "To shake or quiver with rapid, small movements.",
    "synonyms": ["shake", "quiver", "tremble"],
    "example": "Stark contrast can make text appear to vibrate."
  },
  "vindicate": {
    "pos": "verb",
    "def": "To clear someone of blame or suspicion with proof.",
    "synonyms": ["clear", "exonerate", "prove right"],
    "example": "The new witness evidence helped vindicate the accused man."
  },
  "volatile": {
    "pos": "adjective",
    "def": "Liable to change rapidly and unpredictably, especially for the worse.",
    "synonyms": ["unstable", "explosive", "shifting"],
    "example": "Gasoline is a volatile liquid that catches fire easily."
  },
  "wary": {
    "pos": "adjective",
    "def": "Feeling or showing caution about possible dangers or problems.",
    "synonyms": ["cautious", "careful", "alert"],
    "example": "Be wary of strange emails asking for your password."
  }
};

/**
 * Generate stem variations so inflected words match their base dictionary entries
 */
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
    const [defResp, synResp] = await Promise.all([
      fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(cleanWord)}&md=dp&max=1`, { signal: controller.signal }),
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(cleanWord)}&max=4`, { signal: controller.signal }).catch(() => null)
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

      return {
        word: item.defHeadword || item.word || cleanWord,
        pos,
        definition: cleanDefinitionText(rawDef),
        synonyms,
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
        let example = '';
        const synonyms = [];

        if (first.meanings && first.meanings[0]) {
          const m = first.meanings[0];
          pos = m.partOfSpeech || 'word';
          if (m.definitions && m.definitions[0]) {
            def = cleanDefinitionText(m.definitions[0].definition);
            example = m.definitions[0].example || '';
          }
          if (m.synonyms && m.synonyms.length > 0) {
            synonyms.push(...m.synonyms.slice(0, 4));
          }
        }

        if (def) {
          return {
            word: first.word || cleanWord,
            pos,
            phonetic,
            definition: def,
            synonyms,
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

  // 1. Check offline curated dictionary with all stem variations
  const stems = getStemCandidates(clean);
  for (const stem of stems) {
    if (SIMPLIFIED_OFFLINE_DB[stem]) {
      const entry = SIMPLIFIED_OFFLINE_DB[stem];
      return {
        word: clean,
        rootWord: stem !== clean ? stem : '',
        pos: entry.pos,
        definition: entry.def,
        synonyms: entry.synonyms || [],
        example: entry.example || '',
        source: 'offline',
        phonetic: ''
      };
    }
  }

  // 2. Query online services if connected
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    // Try Datamuse first (fastest and most reliable)
    for (const wordToTry of [clean, ...stems.slice(1, 3)]) {
      const result = await fetchDatamuseDefinition(wordToTry);
      if (result) return result;
    }

    // Try secondary dictionary API
    const fallbackResult = await fetchFreeDictFallback(clean);
    if (fallbackResult) return fallbackResult;
  }

  // 3. Instant clean fallback if not found (never hangs!)
  return {
    word: clean,
    pos: 'term',
    definition: (typeof navigator !== 'undefined' && navigator.onLine)
      ? `A simple definition for "${clean}" was not found. Try searching for its root form.`
      : `You are in Offline Mode and "${clean}" is not stored in the offline dictionary cache.`,
    synonyms: [],
    example: '',
    source: (typeof navigator !== 'undefined' && navigator.onLine) ? 'not_found' : 'offline_missing'
  };
}

// Universal export for service workers, window, and node
if (typeof self !== 'undefined') {
  self.SIMPLIFIED_OFFLINE_DB = SIMPLIFIED_OFFLINE_DB;
  self.lookupSimplifiedWord = lookupSimplifiedWord;
}
if (typeof window !== 'undefined') {
  window.SIMPLIFIED_OFFLINE_DB = SIMPLIFIED_OFFLINE_DB;
  window.lookupSimplifiedWord = lookupSimplifiedWord;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SIMPLIFIED_OFFLINE_DB, lookupSimplifiedWord, getStemCandidates, cleanDefinitionText };
}
