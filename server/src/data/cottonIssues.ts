import type {
  CottonIssue,
  CottonIssueCategory,
} from "../types/cottonIssue.js";

const reviewedDate = "2026-10-24";
const tnauDiseaseUrl =
  "https://agritech.tnau.ac.in/crop_protection/crop_prot_crop%20diseases_cash%20crops_cotton.html";
const tnauPestUrl =
  "https://agritech.tnau.ac.in/crop_protection/crop_prot_crop_insectpest%20_cotton.html";
const cicrGuideUrl =
  "https://www.cicr.org.in/wp-content/uploads/Diseases-and-Disorders-of-Cotton.pdf";

type IssueDetails = Partial<
  Pick<
    CottonIssue,
    | "scientificName"
    | "commonSymptoms"
    | "identificationTips"
    | "favorableConditions"
    | "cropStagesAffected"
    | "prevention"
    | "integratedManagement"
    | "monitoringGuidance"
    | "regionRelevance"
  >
> & {
  id: string;
  name: string;
  category: CottonIssueCategory;
};

const notVerified = (detail: string) =>
  `${detail} was not verified in the accessible cited material.`;

const makeIssue = (details: IssueDetails): CottonIssue => {
  const isPest = details.category === "pest";
  const isDisorder = details.category === "crop_disorder";
  return {
    id: details.id,
    name: details.name,
    scientificName: details.scientificName ?? null,
    category: details.category,
    severity: {
      level: "unverified",
      explanation:
        "No comparable severity rating was verified in the cited sources. Impact depends on diagnosis, crop stage, cultivar and local incidence; this label does not mean low risk.",
    },
    commonSymptoms: details.commonSymptoms ?? [
      notVerified("Common symptoms"),
    ],
    identificationTips: details.identificationTips ?? [
      notVerified("Diagnostic identification characteristics"),
    ],
    favorableConditions: details.favorableConditions ?? notVerified("Favorable conditions"),
    cropStagesAffected: details.cropStagesAffected ?? [
      notVerified("Affected crop stages"),
    ],
    prevention:
      details.prevention ??
      (isDisorder
        ? [
            "Check field patterns, crop history, soil moisture and available soil or tissue test results before attributing symptoms to a disorder.",
            "Avoid nutrient or irrigation corrections based on leaf appearance alone; confirm the cause with a local agricultural expert.",
          ]
        : [
            "Use healthy seed and varieties with locally verified resistance when recommended by TNAU or ICAR-CICR.",
            "Maintain field sanitation and avoid moving potentially infected plant material between fields.",
            "Use crop-specific preventive practices only after confirming the diagnosis with a local agricultural expert.",
          ]),
    integratedManagement:
      details.integratedManagement ??
      (isPest
        ? [
            "Confirm the pest and life stage before deciding on control; conserve natural enemies and use cultural or mechanical measures where suitable.",
            "Use only currently registered products and label directions after consulting local agricultural experts; no pesticide dose is provided in this library.",
          ]
        : [
            "Confirm the cause before acting; distinguish infectious disease from nutrient, water, weather and other non-infectious injury.",
            "Use locally validated resistant varieties and sanitation measures where appropriate. Seek a diagnosis and treatment decision from TNAU, ICAR-CICR or a local extension expert.",
          ]),
    monitoringGuidance:
      details.monitoringGuidance ??
      (isPest
        ? [
            "Scout representative plants regularly, including leaf undersides and fruiting parts; record the pest, life stage and affected plants.",
            "Compare observations with current local TNAU/ICAR thresholds. A threshold was not verified for this entry.",
          ]
        : [
            "Record the location, spread, crop stage and progression of symptoms; inspect both affected and apparently healthy plants.",
            "Submit representative samples or photographs to a local agricultural expert before treatment. A validated monitoring threshold was not verified.",
          ]),
    regionRelevance: details.regionRelevance ?? {
      region: "India; Tamil Nadu",
      status: "unverified",
      note: "The requested cotton relevance is recorded, but occurrence in a specific Indian state or Tamil Nadu zone was not verified in the accessible cited material.",
    },
    referenceSources:
      details.category === "pest"
        ? [
            {
              title: "TNAU: Cotton insect pests",
              url: tnauPestUrl,
              notes:
                "Entry-level details are cited only where available from this cotton pest guide; otherwise the specific profile is marked unverified.",
            },
          ]
        : [
            {
              title: "TNAU: Cotton diseases",
              url: tnauDiseaseUrl,
              notes:
                "The page was reachable, but its disease-specific profile text was not available for verification during this review.",
            },
            {
              title: "ICAR-CICR: Cotton disease and disorder field guide",
              url: cicrGuideUrl,
              notes:
                "The supplied PDF URL returned 404 during review; no disease-specific facts are attributed to it.",
            },
          ],
    lastReviewed: reviewedDate,
  };
};

const tnauPestRelevance = {
  region: "Tamil Nadu, India",
  status: "verified" as const,
  note: "Listed in TNAU's cotton insect-pest guide; district-level presence and current pressure still require local scouting.",
};

export const cottonIssues: CottonIssue[] = [
  makeIssue({
    id: "bacterial-blight-angular-leaf-spot",
    name: "Bacterial blight / angular leaf spot",
    category: "disease",
  }),
  makeIssue({
    id: "alternaria-leaf-spot",
    name: "Alternaria leaf spot",
    category: "disease",
  }),
  makeIssue({
    id: "grey-mildew",
    name: "Grey mildew",
    category: "disease",
  }),
  makeIssue({
    id: "myrothecium-leaf-spot",
    name: "Myrothecium leaf spot",
    category: "disease",
  }),
  makeIssue({
    id: "fusarium-wilt",
    name: "Fusarium wilt",
    category: "disease",
  }),
  makeIssue({
    id: "verticillium-wilt",
    name: "Verticillium wilt",
    category: "disease",
  }),
  makeIssue({
    id: "root-rot",
    name: "Root rot",
    category: "disease",
  }),
  makeIssue({
    id: "cotton-leaf-curl-virus-disease",
    name: "Cotton leaf curl virus disease",
    category: "disease",
  }),
  makeIssue({
    id: "anthracnose",
    name: "Anthracnose",
    category: "disease",
  }),
  makeIssue({
    id: "cercospora-leaf-spot",
    name: "Cercospora leaf spot",
    category: "disease",
  }),
  makeIssue({
    id: "target-leaf-spot",
    name: "Target leaf spot",
    category: "disease",
  }),
  makeIssue({
    id: "leaf-rust",
    name: "Leaf rust",
    category: "disease",
  }),
  makeIssue({
    id: "boll-rot",
    name: "Boll rot",
    category: "disease",
  }),
  makeIssue({
    id: "internal-boll-rot",
    name: "Internal boll rot",
    category: "disease",
  }),
  makeIssue({
    id: "tobacco-streak-virus-disease",
    name: "Tobacco streak virus disease",
    category: "disease",
  }),
  makeIssue({
    id: "pink-bollworm",
    name: "Pink bollworm",
    scientificName: "Pectinophora gossypiella",
    category: "pest",
    commonSymptoms: [
      "Rosetted flowers.",
      "Larval entry holes plugged with excreta; larvae feed inside seed kernels.",
      "Interlocular feeding can burrow adjoining seeds, described by TNAU as double seeds.",
      "Bud and immature-boll drop, discoloured lint and burrowed seeds.",
    ],
    identificationTips: [
      "TNAU describes larvae with variable colour and alternating dark and light body bands.",
      "The adult is a small moth with fringed hindwing margins.",
    ],
    cropStagesAffected: ["Flowering and boll development; fruiting parts and immature bolls."],
    monitoringGuidance: [
      "TNAU recommends pheromone traps to monitor adult moth activity and regular in-situ crop surveys.",
      "Record infested fruiting parts and compare with current local action guidance.",
    ],
    integratedManagement: [
      "Use pheromone monitoring and locally advised biological or cultural controls; TNAU's guide discusses parasitoid-based control.",
      "Avoid repeated or calendar-based insecticide sprays. Consult current local experts about any intervention.",
    ],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "american-bollworm",
    name: "American bollworm",
    scientificName: "Helicoverpa armigera",
    category: "pest",
    commonSymptoms: [
      "Regular, circular boreholes in bolls with granular frass outside the hole.",
      "Larvae may feed with the head inside the boll and the remainder of the body outside.",
    ],
    identificationTips: [
      "TNAU describes larvae with variable green-to-brown colour and body lines.",
      "The adult is a stout moth with a central forewing spot and a dark outer margin on the pale hindwings.",
    ],
    cropStagesAffected: ["Square formation through boll development; exact local timing varies."],
    monitoringGuidance: [
      "Inspect squares, flowers and bolls for eggs, larvae, boreholes and frass; TNAU recommends traps and field surveys.",
      "Use current local thresholds rather than relying on this library for a treatment decision.",
    ],
    integratedManagement: [
      "Use regular scouting, crop sanitation and conservation of natural enemies; TNAU describes biological-control options.",
      "Do not apply insecticides solely on a calendar schedule; seek local advice and follow current registered product labels.",
    ],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "spotted-bollworm",
    name: "Spotted bollworm",
    scientificName: "Earias vittella",
    category: "pest",
    commonSymptoms: [
      "Drying or drooping terminal shoots before flowering.",
      "Shedding of squares and young bolls, flared bracts and boll holes; damaged bolls may rot.",
    ],
    identificationTips: [
      "TNAU describes the larva as brownish with dorsal white streaks and a pale-yellow underside.",
      "The adult forewing is pea green with a wedge-shaped white band.",
    ],
    cropStagesAffected: ["Pre-flowering shoots, square formation and young bolls."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "spiny-bollworm",
    name: "Spiny bollworm",
    scientificName: "Earias insulana",
    category: "pest",
    commonSymptoms: [
      "Drying or drooping terminal shoots before flowering.",
      "Shedding of squares and young bolls, flared bracts and boll holes; damaged bolls may rot.",
    ],
    identificationTips: [
      "TNAU describes larvae with fleshy tubercles on the thoracic and abdominal segments.",
      "The adult forewings are described as uniformly silvery green.",
    ],
    cropStagesAffected: ["Pre-flowering shoots, square formation and young bolls."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "whitefly",
    name: "Whitefly",
    scientificName: "Bemisia tabaci",
    category: "pest",
    commonSymptoms: [
      "Chlorotic spots may merge into irregular yellowing; severe attack can cause premature defoliation.",
      "Sooty mould, bud and boll shedding, and poor boll opening are described by TNAU.",
      "Whitefly transmits cotton leaf curl virus disease.",
    ],
    identificationTips: [
      "Inspect leaf undersides for oval nymphs and puparia.",
      "Adults are minute, yellow-bodied insects covered by a white waxy bloom.",
    ],
    cropStagesAffected: ["Leaf, bud and boll stages; TNAU does not specify a single crop-stage window."],
    monitoringGuidance: [
      "Inspect leaf undersides and record counts; TNAU describes yellow pan or sticky traps alongside in-situ counts.",
      "Use current local action guidance; thresholds can vary and are not specified here.",
    ],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "jassid-cotton-leafhopper",
    name: "Jassid / cotton leafhopper",
    scientificName: "Amrasca (Biguttula biguttula) devastans",
    category: "pest",
    commonSymptoms: [
      "Tender leaves turn yellow; margins curl downwards and may redden.",
      "Severe feeding can cause bronze or brick-red hopper burn, brittle leaf margins, drying, shedding and reduced growth.",
    ],
    identificationTips: [
      "Inspect leaf undersides between the veins for light-green, translucent, wingless nymphs.",
      "Adults are green and wedge-shaped.",
    ],
    cropStagesAffected: ["Tender-leaf and vegetative growth; the source does not define a fixed stage."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "thrips",
    name: "Thrips",
    scientificName: "Thrips tabaci",
    category: "pest",
    commonSymptoms: [
      "Leaf shrivelling from epidermal scraping and sap feeding.",
      "Ragged terminal buds and a silvery sheen on the leaf underside.",
    ],
    identificationTips: [
      "Nymphs are minute, slender and yellowish.",
      "Adults are small, slender, yellowish to brown insects with fringed wings.",
    ],
    cropStagesAffected: ["Terminal buds and leaves; a fixed crop-stage window was not verified."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "aphids",
    name: "Aphids",
    scientificName: "Aphis gossypii",
    category: "pest",
    commonSymptoms: [
      "Colonies on tender shoots and leaf undersides; leaves may curl or crinkle.",
      "Stunted growth and, in severe infestation, a blighted appearance and honeydew-associated sooty mould.",
    ],
    identificationTips: [
      "TNAU describes small, soft-bodied greenish-brown adults and yellowish or greenish-brown nymphs on leaf undersides.",
      "Winged forms may occur in crowded colonies.",
    ],
    cropStagesAffected: ["Tender shoots and leaves; a fixed crop-stage window was not verified."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "mealybugs",
    name: "Mealybugs",
    category: "pest",
  }),
  makeIssue({
    id: "tobacco-caterpillar",
    name: "Tobacco caterpillar",
    scientificName: "Spodoptera litura",
    category: "pest",
    commonSymptoms: [
      "Young larvae scrape leaf tissue and may leave the veins as a skeleton.",
      "Small holes in leaves; severe attack can cause extensive defoliation.",
    ],
    identificationTips: [
      "TNAU describes egg masses and early larvae feeding gregariously.",
      "Larvae are pale greenish with dark markings; adults have brown forewings with wavy white markings.",
    ],
    cropStagesAffected: ["Leaf-feeding stages; severe feeding can continue into boll-bearing crop."],
    monitoringGuidance: [
      "Inspect leaves for egg masses, grouped young larvae and feeding damage; TNAU describes light and pheromone trap monitoring.",
      "Use current local thresholds and expert advice before intervention.",
    ],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "red-cotton-bug",
    name: "Red cotton bug",
    scientificName: "Dysdercus cingulatus",
    category: "pest",
    commonSymptoms: [
      "Red-stained lint and rotting bolls.",
      "Young bolls may abort and turn dark brown; TNAU also describes water-soaked spots on the inner boll wall.",
    ],
    identificationTips: [
      "Inspect cotton bolls and lint for bug presence and the described staining or boll injury; further diagnostic features were not verified.",
    ],
    cropStagesAffected: ["Boll development and maturation."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "dusky-cotton-bug",
    name: "Dusky cotton bug",
    category: "pest",
  }),
  makeIssue({
    id: "mirid-bug",
    name: "Mirid bug",
    category: "pest",
  }),
  makeIssue({
    id: "cotton-leaf-roller",
    name: "Cotton leaf roller",
    scientificName: "Sylepta derogata",
    category: "pest",
    commonSymptoms: [
      "Leaves roll into trumpet-like shapes secured by silken threads.",
      "Leaf margins are eaten; severe attack can defoliate plants.",
    ],
    identificationTips: [
      "Larvae are bright green with a dark head and prothoracic shield.",
      "Adults are moths with yellow wings and brown wavy markings.",
    ],
    cropStagesAffected: ["Leaf growth; a fixed crop-stage window was not verified."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "semi-looper",
    name: "Semi-looper",
    category: "pest",
  }),
  makeIssue({
    id: "stem-weevil",
    name: "Stem weevil",
    scientificName: "Pempheres (Pempherulus) affinis",
    category: "pest",
    commonSymptoms: [
      "Swelling or galling on the stem just above ground level.",
      "Young plants may die; surviving older plants may lack vigour and can break at nodes.",
    ],
    identificationTips: [
      "TNAU describes a small, dark adult weevil with two small white patches on the elytra.",
      "The grub is white and legless.",
    ],
    cropStagesAffected: ["Seedling and young-plant stages; older plants can also be affected."],
    regionRelevance: tnauPestRelevance,
  }),
  makeIssue({
    id: "leaf-reddening",
    name: "Leaf reddening",
    category: "crop_disorder",
    commonSymptoms: [
      notVerified("The defining symptom pattern and diagnostic criteria for cotton leaf reddening"),
    ],
    identificationTips: [
      "Treat this as a crop disorder, not an infectious disease. Rule out leafhopper injury, nutrient imbalance, water stress and other causes through diagnosis.",
    ],
    prevention: [
      "Maintain balanced crop nutrition and irrigation based on soil testing and local agronomic advice.",
      "Do not assume potassium deficiency or apply nutrients solely from leaf colour; confirm the cause first.",
    ],
    integratedManagement: [
      "Compare affected and unaffected areas, check crop and soil history, and request soil or plant analysis.",
      "Choose corrective action only after an expert distinguishes physiological stress from pest or pathogen injury.",
    ],
    regionRelevance: {
      region: "India; Tamil Nadu",
      status: "unverified",
      note: "Included as a requested cotton disorder; specific regional occurrence and diagnostic details were not verified from the accessible sources.",
    },
  }),
];

export const cottonIssueCounts = (issues: CottonIssue[]) => ({
  all: issues.length,
  disease: issues.filter((issue) => issue.category === "disease").length,
  pest: issues.filter((issue) => issue.category === "pest").length,
  crop_disorder: issues.filter((issue) => issue.category === "crop_disorder").length,
});
