/**
 * Electrical — the launch trade, and the worked example of the config shape.
 *
 * Everything here is content. If a sentence in this file needs a component
 * changed to say it, the component is wrong: see types.ts for why that seam is
 * load-bearing rather than tidy.
 *
 * ── On the voice ────────────────────────────────────────────────────────────
 * Written to be read by someone who prices work for a living and has been sold
 * software before. That rules out most of the vocabulary a landing page reaches
 * for by default: "streamline", "empower", "leverage", "solution", "seamless",
 * "revolutionise". Those words are how a page announces it was written by
 * somebody who has never taken off a set of prints. Every claim here is one the
 * app can actually be held to today.
 */
import type { TradeContent } from "./types";

export const electrical: TradeContent = {
  id: "electrical",
  label: "Electrical",

  meta: {
    title: "HelixBid — Electrical Estimating Software Built By An Electrician",
    description:
      "Take off plans, price materials and labor from your own rates, and send a professional proposal the same day. Estimating software built by an electrician, for electricians.",
    // The hero screenshot doubles as the sharing preview. One real image of the
    // product beats a separately-produced card that has to be kept in step with
    // it, and a link preview showing the actual screen is the same promise the
    // page makes.
    ogImage: "/brand/shot-bid.jpg",
    ogImageAlt:
      "A HelixBid bid priced out: line items with quantities and hours on the left, and a bid total breaking down materials, labor, overhead and markup on the right",
  },

  hero: {
    eyebrow: "Electrical estimating",
    headline: "Electrical Estimating Built By An Electrician, For Electricians",
    subhead:
      "Count devices straight off the plans, price them against your own material costs and labor rates, adjust for how the job actually runs, and hand the customer a proposal the same day. No spreadsheets to babysit.",
    ctaLabel: "Get early access",
    ctaNote: "Free while in early access. No card, no sales call.",
    highlights: [
      "Your prices, not a catalog's",
      "Takeoffs on the real drawings",
      "Proposal out the same day",
    ],
    shot: {
      // A real capture of the running app, not a mockup — see the note on
      // TradeShot in types.ts for why this is the one image that matters.
      src: "/brand/shot-bid.jpg",
      alt: "A HelixBid bid priced out: line items grouped by suite with quantities, hours and costs, beside a bid total breaking down materials, labor, overhead and markup to a final bid price",
      caption: "A bid, priced — every figure traced back to your own rates",
      width: 1523,
      height: 784,
    },
  },

  problem: {
    heading: "You already know where the money goes",
    intro:
      "It isn't the pipe and it isn't the wire. It's the four hours on a Sunday night with a set of prints, a highlighter and a spreadsheet somebody built in 2019.",
    pains: [
      {
        title: "The spreadsheet nobody trusts",
        body: "Formulas that broke two jobs ago. A copy for every bid, each one slightly different. One wrong cell reference and the number at the bottom is confidently wrong.",
      },
      {
        title: "Materials you find out about on site",
        body: "The receptacles got counted. The plates, the rings, the whips and the fittings didn't. Every one of them is real money, and every one comes out of your margin.",
      },
      {
        title: "Two bids, two different prices",
        body: "The same work priced twice, six weeks apart, coming out hundreds apart — because it depended on which day it was and how tired you were.",
      },
      {
        title: "Winning the ones you should have lost",
        body: "The worst outcome in estimating isn't losing a bid. It's winning one you priced wrong and finding out in month three.",
      },
    ],
    turn: "Price it once, price it the same way every time, and know what's in the number.",
  },

  howItWorks: {
    heading: "How it works",
    subheading:
      "Four steps, in the order you'd actually do them. Nothing to import, nothing to configure for a week before it's useful.",
    steps: [
      {
        title: "Trace and count on the real plans",
        body: "Load the PDF the architect sent. Measure runs against the sheet's own scale, stamp each device where it sits, and watch the count climb next to the drawing. Your legend symbols link to your assemblies once, then carry to every job after.",
        icon: "ruler",
      },
      {
        title: "Materials and labor price themselves",
        body: "Every device is an assembly — the box, the ring, the plate, the device, the hours. Priced from your material costs and your crew's rates, not a catalog's idea of them.",
        icon: "calculator",
      },
      {
        title: "Adjust for how the job really runs",
        body: "Ceiling height, occupied building, overtime, a crew that beats book hours. Percentage adjustments on top of the labor, applied consistently instead of guessed at the end.",
        icon: "sliders",
      },
      {
        title: "Send a proposal, not a number on a napkin",
        body: "Your letterhead, the work included, one price. The customer sees what they're buying and what it costs — not your cost breakdown and not an invitation to argue about your margin.",
        icon: "fileText",
      },
    ],
  },

  different: {
    heading: "Why it's different",
    subheading:
      "Four things this does differently, and the reasons behind each one.",
    cards: [
      {
        title: "Built for the truck, not the boardroom",
        body: "Designed to be used one-handed on a laptop with the supply house closing in twenty minutes. Edits save as you make them. Lists load fast whether you have thirty materials or five thousand.",
        icon: "hardHat",
      },
      {
        title: "Math you can check, not a model's opinion",
        body: "Every total traces back to a material cost, an hour count and a percentage you set. The same inputs give the same number, today and next March. Where AI helps — reading a plan sheet — it proposes and you approve; it never quietly changes a price.",
        icon: "shieldCheck",
      },
      {
        title: "You keep the final say, always",
        body: "Nothing lands on a bid without you putting it there. Suggestions are visibly suggestions. When the tool isn't sure, it says so and asks — instead of guessing and hoping you don't notice.",
        icon: "gauge",
      },
      {
        title: "It grows with the business",
        body: "Start with the starter library and replace prices as you check them. Build assemblies once and reuse them for years. When you add a second trade, your electrical work doesn't get rebuilt around it.",
        icon: "trendingUp",
      },
    ],
  },

  credibility: {
    heading: "Built in the field, tested by real electricians",
    body: "This isn't a startup's guess at what estimating looks like. It's being built by someone who has priced this work, lost jobs to a bad number, and won jobs that cost money to finish. Every screen exists because something on a real bid went wrong without it.",
    points: [
      {
        title: "Every price starts at zero",
        body: "The starter library ships unpriced — deliberately. A plausible number nobody chose looks exactly like one you checked, and it can be bid and won on. Zero can't be mistaken for a quote.",
        icon: "receipt",
      },
      {
        title: "Nothing is priced behind your back",
        body: "A line's cost is frozen the moment you add it. Re-pricing a material next month never quietly reissues a quote you already sent.",
        icon: "clock",
      },
      {
        title: "Honest about what it isn't yet",
        body: "It's in early access, and it's being shaped by the people using it on live bids. If something doesn't fit how you work, that's a conversation, not a support ticket.",
        icon: "layers",
      },
    ],
    signature: "— Built by a working electrician",
  },

  cta: {
    heading: "Get early access",
    body: "Early access is open to a small group of electrical contractors putting it on real bids. Leave your email and you'll hear from us when a spot opens.",
    buttonLabel: "Request early access",
    placeholder: "you@yourcompany.com",
    privacy:
      "We'll only use this to notify you when early access opens. No spam, no list sharing, unsubscribe any time.",
    success: "You're on the list. We'll be in touch when a spot opens.",
    alreadyOn: "You're already on the list — we'll be in touch.",
  },

  vocabulary: {
    tradespeople: "electricians",
    tradespersonWithArticle: "an electrician",
    countedThing: "devices",
  },
};
