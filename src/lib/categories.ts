// https://data.police.uk/api/crime-categories

export type DeckColour = readonly [
    number,
    number,
    number
];

type CrimeCategoryDefinition = {
    description: string;
    colour: DeckColour;
};

export const crimeCategories: Record<string, CrimeCategoryDefinition> = {
    "anti-social-behaviour": {
        description: "Anti-social behaviour",
        colour: [255, 204, 102],
    },
    "bicycle-theft": {
        description: "Bicycle theft",
        colour: [102, 178, 255],
    },
    "burglary": {
        description: "Burglary",
        colour: [255, 128, 0],
    },
    "criminal-damage-arson": {
        description: "Criminal damage and arson",
        colour: [255, 51, 51],
    },
    "drugs": {
        description: "Drugs",
        colour: [153, 102, 255],
    },
    "other-theft": {
        description: "Other theft",
        colour: [255, 153, 204],
    },
    "possession-of-weapons": {
        description: "Possession of weapons",
        colour: [219, 69, 69],
    },
    "public-order": {
        description: "Public order",
        colour: [255, 255, 102],
    },
    "robbery": {
        description: "Robbery",
        colour: [255, 102, 102],
    },
    "shoplifting": {
        description: "Shoplifting",
        colour: [255, 204, 153],
    },
    "theft-from-the-person": {
        description: "Theft from the person",
        colour: [255, 153, 102],
    },
    "vehicle-crime": {
        description: "Vehicle crime",
        colour: [102, 255, 102],
    },
    "violent-crime": {
        description: "Violence and sexual offences",
        colour: [255, 0, 0],
    },
    "other-crime": {
        description: "Other crime",
        colour: [192, 192, 192],
    },
} as const;
