export const courtDisposals = {
    awaitingCourtResult: {
        description: "Awaiting court outcome",
        colour: "rgb(255, 223, 0)", // yellow
    },
    courtResultUnavailable: {
        description: "Court result unavailable",
        colour: "rgb(128, 128, 128)", // grey
    },
    unableToProceed: {
        description: "Court case unable to proceed",
        colour: "rgb(255, 102, 102)", // light red
    },
    localResolution: {
        description: "Local resolution",
        colour: "rgb(102, 204, 255)", // light blue
    },
    noFurtherAction: {
        description: "Investigation complete; no suspect identified",
        colour: "rgb(192, 192, 192)", // silver/grey
    },
    deprivedOfProperty: {
        description: "Offender deprived of property",
        colour: "rgb(255, 128, 0)", // orange
    },
    fined: {
        description: "Offender fined",
        colour: "rgb(255, 0, 0)", // red
    },
    absoluteDischarge: {
        description: "Offender given absolute discharge",
        colour: "rgb(0, 204, 0)", // green
    },
    cautioned: {
        description: "Offender given a caution",
        colour: "rgb(255, 204, 102)", // light orange
    },
    drugsPossessionWarning: {
        description: "Offender given a drugs possession warning",
        colour: "rgb(255, 153, 204)", // pink
    },
    penaltyNoticeIssued: {
        description: "Offender given a penalty notice",
        colour: "rgb(255, 255, 153)", // light yellow
    },
    communityPenalty: {
        description: "Offender given community sentence",
        colour: "rgb(102, 255, 102)", // light green
    },
    conditionalDischarge: {
        description: "Offender given conditional discharge",
        colour: "rgb(0, 255, 255)", // cyan
    },
    suspendedSentence: {
        description: "Offender given suspended prison sentence",
        colour: "rgb(153, 102, 255)", // purple
    },
    imprisoned: {
        description: "Offender sent to prison",
        colour: "rgb(153, 0, 0)", // dark red
    },
    otherCourtDisposal: {
        description: "Offender otherwise dealt with",
        colour: "rgb(128, 0, 128)", // dark purple
    },
    compensation: {
        description: "Offender ordered to pay compensation",
        colour: "rgb(255, 204, 153)", // peach
    },
    sentencedInAnotherCase: {
        description: "Suspect charged as part of another case",
        colour: "rgb(204, 153, 255)", // lavender
    },
    charged: {
        description: "Suspect charged",
        colour: "rgb(255, 102, 102)", // red
    },
    notGuilty: {
        description: "Defendant found not guilty",
        colour: "rgb(0, 204, 0)", // green
    },
    sentToCrownCourt: {
        description: "Defendant sent to Crown Court",
        colour: "rgb(102, 51, 153)", // dark violet
    },
    unableToProsecute: {
        description: "Unable to prosecute suspect",
        colour: "rgb(204, 204, 204)", // grey
    },
    formalActionNotInPublicInterest: {
        description: "Formal action is not in the public interest",
        colour: "rgb(153, 153, 153)", // grey
    },
    actionTakenByAnotherOrganisation: {
        description: "Action to be taken by another organisation",
        colour: "rgb(102, 178, 255)", // sky blue
    },
    furtherInvestigationNotInPublicInterest: {
        description: "Further investigation is not in the public interest",
        colour: "rgb(153, 153, 204)", // slate
    },
    furtherActionNotInPublicInterest: {
        description: "Further action is not in the public interest",
        colour: "rgb(153, 153, 204)", // same as above
    },
    underInvestigation: {
        description: "Under investigation",
        colour: "rgb(255, 255, 153)", // light yellow
    },
    statusUpdateUnavailable: {
        description: "Status update unavailable",
        colour: "rgb(128, 128, 128)", // grey
    },
    unknown: {
        description: "Outcome unknown",
        colour: "rgb(128, 128, 128)", // grey
    }
};

export const outcomeDescriptionToKey = Object.fromEntries(
    Object.entries(courtDisposals).map(([key, { description }]) => [description, key])
);

