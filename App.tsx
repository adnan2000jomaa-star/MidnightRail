import React, { useState } from "react";
import "./App.css";

type StatKey = "brave" | "smart" | "kind" | "alert" | "sneaky" | "memory";
type PersonKey = "gray" | "luna" | "stone" | "finn";

type GameState = {
  stats: Record<StatKey, number>;
  trust: Record<PersonKey, number>;
  clues: string[];
  flags: Record<string, boolean>;
  history: string[];
};

type Choice = {
  label: string;
  next: string;
  fx?: Partial<Record<StatKey, number>>;
  trust?: Partial<Record<PersonKey, number>>;
  clue?: string;
  flag?: string;
  condition?: (state: GameState) => boolean;
};

type Scene = {
  chapter: string;
  title: string;
  place: string;
  art: string;
  text: string[];
  choices: Choice[];
  ending?: boolean;
  endingTitle?: string;
};

const statInfo: Record<StatKey, { label: string; icon: string }> = {
  brave: { label: "Brave", icon: "🛡️" },
  smart: { label: "Smart", icon: "🧠" },
  kind: { label: "Kind", icon: "❤️" },
  alert: { label: "Alert", icon: "👁️" },
  sneaky: { label: "Sneaky", icon: "🎭" },
  memory: { label: "Memory", icon: "🕯️" },
};

const people: Record<PersonKey, { label: string; desc: string }> = {
  gray: { label: "Mr. Gray", desc: "The conductor" },
  luna: { label: "Luna Bell", desc: "Girl with the music box" },
  stone: { label: "Detective Stone", desc: "Old detective" },
  finn: { label: "Finn Fox", desc: "Smiling stranger" },
};

function clamp(v: number, min = -10, max = 10) {
  return Math.max(min, Math.min(max, v));
}

function freshGame(): GameState {
  return {
    stats: { brave: 0, smart: 0, kind: 0, alert: 0, sneaky: 0, memory: 0 },
    trust: { gray: 0, luna: 0, stone: 0, finn: 0 },
    clues: [],
    flags: {},
    history: [],
  };
}

function countFlags(state: GameState, prefix: string) {
  return Object.keys(state.flags).filter((k) => k.startsWith(prefix)).length;
}

const scenes: Record<string, Scene> = {
  start: {
    chapter: "Prologue",
    title: "The Rainy Station",
    place: "Old North Station • 11:07 PM",
    art: "station",
    text: [
      "Rain falls hard on the empty platform. Alex Vale stands alone with a small bag and a strange letter.",
      "The letter says: Your mother is alive. Take the midnight train. Find Carriage Seven. Do not fall asleep.",
      "Alex's mother vanished ten years ago. Tonight, a black train arrives even though no train is on the schedule.",
    ],
    choices: [
      { label: "Read the strange ticket in your pocket", next: "ticket", fx: { smart: 1 }, clue: "Strange Ticket" },
      { label: "Read the letter again", next: "letter", fx: { memory: 1 }, clue: "Mother's Letter" },
      { label: "Step closer to the train", next: "trainArrives", fx: { brave: 1 } },
      { label: "Look around the platform first", next: "shadow", fx: { alert: 1 }, clue: "Shadow on Platform" },
    ],
  },

  ticket: {
    chapter: "Prologue",
    title: "The Ticket",
    place: "Old North Station",
    art: "ticket",
    text: [
      "The ticket is warm. It has Alex's name on it, but Alex never bought it.",
      "It says: Passenger: Alex Vale. Seat: Not chosen. Destination: Black Hollow.",
      "On the back are four signs: Bell, Eye, Key, Star.",
    ],
    choices: [
      { label: "Remember the four signs", next: "trainArrives", fx: { smart: 1, memory: 1 }, clue: "Bell Eye Key Star" },
      { label: "Hide the ticket", next: "trainArrives", fx: { alert: 1 }, flag: "hidTicket" },
    ],
  },

  letter: {
    chapter: "Prologue",
    title: "The Letter",
    place: "Old North Station",
    art: "letter",
    text: [
      "The letter has no name on it.",
      "It says: Your mother is trapped near Black Hollow. Do not trust the man with the silver ring.",
      "The last line says: Do not sleep before midnight.",
    ],
    choices: [
      { label: "Keep the letter safe", next: "trainArrives", fx: { kind: 1 }, flag: "keptLetter" },
      { label: "Search for the sender", next: "shadow", fx: { alert: 1 }, clue: "Someone Was Watching" },
    ],
  },

  shadow: {
    chapter: "Prologue",
    title: "Someone Is Watching",
    place: "Old North Station",
    art: "shadow",
    text: [
      "At the end of the platform, someone stands under a broken lamp.",
      "They raise one hand, like a warning. Then the train whistle screams, and they vanish.",
    ],
    choices: [
      { label: "Run toward the shadow", next: "foundPin", fx: { brave: 1, alert: 1 }, clue: "Silver Pin" },
      { label: "Board before the train leaves", next: "trainArrives", fx: { smart: 1 } },
    ],
  },

  foundPin: {
    chapter: "Prologue",
    title: "The Silver Pin",
    place: "Old North Station",
    art: "pin",
    text: ["Alex finds a small silver pin shaped like an eye.", "On the back are two words: She waits."],
    choices: [{ label: "Take the pin and board", next: "trainArrives", fx: { alert: 1, memory: 1 }, clue: "She Waits Pin" }],
  },

  trainArrives: {
    chapter: "Chapter One",
    title: "The Midnight Rail",
    place: "Old North Station • 11:13 PM",
    art: "train",
    text: [
      "The black train stops with a hiss of steam. Gold letters on the side read: THE MIDNIGHT RAIL.",
      "A tall conductor steps down. His name tag says: Mr. Gray.",
      "He looks at Alex and says, 'Ticket, please.'",
    ],
    choices: [
      { label: "Give him the ticket", next: "grayQuestion", fx: { kind: 1 }, trust: { gray: 1 } },
      { label: "Ask where this train goes", next: "grayWhere", fx: { smart: 1, alert: 1 }, trust: { gray: -1 } },
      { label: "Ask if he knows your mother", next: "grayMother", fx: { memory: 1 }, trust: { gray: -1 }, clue: "Gray Knew Mom" },
    ],
  },

  grayWhere: {
    chapter: "Chapter One",
    title: "Where It Goes",
    place: "Train Door",
    art: "gray",
    text: ["Mr. Gray smiles, but his eyes stay cold.", "'This train goes to places people try to forget,' he says. 'Tonight, it goes to Black Hollow.'"],
    choices: [
      { label: "Give him the ticket now", next: "grayQuestion", fx: { smart: 1 }, trust: { gray: 1 } },
      { label: "Step back from the train", next: "loopEnding", fx: { brave: 1 }, trust: { gray: -2 } },
    ],
  },

  grayMother: {
    chapter: "Chapter One",
    title: "Your Mother's Name",
    place: "Train Door",
    art: "gray",
    text: ["Mr. Gray stops smiling.", "'Your mother was brave,' he says. 'Braver than you know.'", "He punches Alex's ticket. The hole is shaped like an eye."],
    choices: [
      { label: "Demand the truth", next: "grayQuestion", fx: { brave: 1, memory: 1 }, trust: { gray: -1 } },
      { label: "Stay quiet and board", next: "grayQuestion", fx: { alert: 1 }, trust: { gray: 1 } },
    ],
  },

  loopEnding: {
    ending: true,
    endingTitle: "Ending: The Loop",
    chapter: "Early Ending",
    title: "The Station Loop",
    place: "Old North Station",
    art: "stationDark",
    text: ["Alex steps away from the train. Mr. Gray closes the door.", "The train leaves. The tracks vanish. The clock resets to 11:07.", "A new ticket appears in Alex's pocket. The same night begins again."],
    choices: [],
  },

  grayQuestion: {
    chapter: "Chapter One",
    title: "One Simple Question",
    place: "Train Door",
    art: "gray",
    text: ["Mr. Gray blocks the doorway.", "'Before you enter,' he says, 'tell me this. Are you traveling alone?'", "Behind Alex, the platform is empty. But the rain sounds like footsteps."],
    choices: [
      { label: "Say: Yes", next: "inside", fx: { brave: 1 }, trust: { gray: -1 }, flag: "alone" },
      { label: "Say: No, someone is waiting for me", next: "inside", fx: { sneaky: 2, alert: 1 }, flag: "claimedFriend" },
      { label: "Ask why he wants to know", next: "inside", fx: { smart: 1 }, trust: { gray: 1 }, clue: "Train Rule" },
    ],
  },

  inside: {
    chapter: "Chapter One",
    title: "Inside the Train",
    place: "The Midnight Rail • 11:21 PM",
    art: "hall",
    text: [
      "The train door shuts. The rain outside becomes silent.",
      "Inside, the train is warm and old. Red seats. Brass lamps. Dark windows.",
      "Mr. Gray says, 'There are seven cars. You may enter six. The seventh must invite you.'",
    ],
    choices: [
      { label: "Ask about Car Seven", next: "carSeven", fx: { smart: 1 }, clue: "Car Seven Rule", trust: { gray: 1 } },
      { label: "Check your phone", next: "phone", fx: { alert: 1 }, clue: "No Signal" },
      { label: "Look out the window", next: "window", fx: { alert: 1 }, clue: "Old Station" },
      { label: "Walk into the passenger car", next: "seatChoice", fx: { brave: 1 } },
    ],
  },

  carSeven: {
    chapter: "Chapter One",
    title: "Car Seven",
    place: "Train Hall",
    art: "doorSeven",
    text: ["'What happens if I enter Car Seven?' Alex asks.", "Mr. Gray lowers his voice. 'If it did not invite you, something inside may come out wearing your face.'"],
    choices: [
      { label: "Ask who invited you", next: "seatChoice", fx: { alert: 1 }, clue: "Hidden Host" },
      { label: "Go to the passenger car", next: "seatChoice", fx: { brave: 1 } },
    ],
  },

  phone: {
    chapter: "Chapter One",
    title: "A Message From Mom",
    place: "Train Hall",
    art: "phone",
    text: ["Alex's phone has no signal. But there is one new voice message.", "The file name is: MOM_LAST_MESSAGE.", "It was created tomorrow."],
    choices: [
      { label: "Play the message", next: "momMessage", fx: { memory: 2 }, clue: "Mom's Voice", flag: "heardMom" },
      { label: "Save it for later", next: "seatChoice", fx: { smart: 1 }, flag: "savedMessage" },
    ],
  },

  momMessage: {
    chapter: "Chapter One",
    title: "Do Not Trust Him",
    place: "Train Hall",
    art: "phone",
    text: ["Static fills the phone. Then Alex hears a voice they never forgot.", "'Alex, if you are on the train, listen carefully. Do not trust the man with the silver ring.'", "The message deletes itself."],
    choices: [
      { label: "Look for a silver ring", next: "seatChoice", fx: { alert: 2 }, clue: "Silver Ring Warning", flag: "knowsRing" },
      { label: "Whisper: Mom, where are you?", next: "memoryFlash", fx: { memory: 2, kind: 1 }, clue: "Mom Heard You" },
    ],
  },

  memoryFlash: {
    chapter: "Chapter One",
    title: "A Small Memory",
    place: "Memory",
    art: "memory",
    text: ["For one second, Alex is a child again.", "Their mother says, 'If a story scares you, ask who wants it to end that way.'", "Then the memory is gone."],
    choices: [{ label: "Hold onto the memory", next: "seatChoice", fx: { memory: 2, kind: 1 }, clue: "Mom's Advice" }],
  },

  window: {
    chapter: "Chapter One",
    title: "The Wrong Year",
    place: "Train Window",
    art: "oldStation",
    text: ["Alex looks out the window. The platform has changed.", "There are gas lamps, old clothes, and horses in the rain.", "The station sign reads: Black Hollow — 1896. But the train has not moved."],
    choices: [
      { label: "Record it with your phone", next: "seatChoice", fx: { smart: 1, alert: 1 }, clue: "Not Yet Video" },
      { label: "Walk away from the window", next: "seatChoice", fx: { brave: 1 } },
    ],
  },

  seatChoice: {
    chapter: "Chapter One",
    title: "Choose a Seat",
    place: "Passenger Car • 11:34 PM",
    art: "carriage",
    text: [
      "The passenger car is quiet. Four seats seem to call to Alex.",
      "Luna Bell holds a locked music box. Detective Stone checks an old watch. Finn Fox smiles like he already knows Alex.",
      "One seat by the window has no name on it. The ticket warms again: Choose your seat carefully.",
    ],
    choices: [
      { label: "Sit with Luna Bell", next: "luna", fx: { kind: 1 }, trust: { luna: 2 }, flag: "satLuna" },
      { label: "Sit with Detective Stone", next: "stone", fx: { smart: 1 }, trust: { stone: 2 }, flag: "satStone" },
      { label: "Sit near Finn Fox", next: "finn", fx: { alert: 1 }, trust: { finn: 2 }, flag: "satFinn" },
      { label: "Sit alone by the window", next: "alone", fx: { smart: 1, alert: 1 }, flag: "satAlone" },
      { label: "Sit in the nameless seat", next: "nameless", fx: { brave: 2, memory: 1 }, clue: "Nameless Seat", flag: "satNameless" },
    ],
  },

  luna: {
    chapter: "Chapter One",
    title: "Luna Bell",
    place: "Passenger Car",
    art: "luna",
    text: ["Luna Bell is calm and careful. She holds a small music box.", "'People come on this train for two reasons,' she says. 'They lost someone, or they are hiding something.'", "The box has four signs: bell, eye, key, and star."],
    choices: [
      { label: "Ask about the music box", next: "musicBox", fx: { smart: 1 }, trust: { luna: 1 }, clue: "Luna's Music Box" },
      { label: "Tell her about your mother", next: "lunaMom", fx: { memory: 1, kind: 1 }, trust: { luna: 1 }, clue: "Luna Knows Mom" },
      { label: "Talk to someone else", next: "beforeMidnight", fx: { smart: 1 } },
    ],
  },

  lunaMom: {
    chapter: "Chapter One",
    title: "Luna Knows Her",
    place: "Passenger Car",
    art: "luna",
    text: ["When Alex says their mother's name, Luna goes still.", "'Do not say that name loudly here,' Luna whispers. 'The train listens for names.'", "The music box plays one soft note by itself."],
    choices: [
      { label: "Ask if your mother is alive", next: "beforeMidnight", fx: { memory: 2, alert: 1 }, trust: { luna: 1 }, clue: "Mom Was Seen" },
      { label: "Try the music box", next: "musicBox", fx: { smart: 1 } },
    ],
  },

  stone: {
    chapter: "Chapter One",
    title: "Detective Stone",
    place: "Passenger Car",
    art: "stone",
    text: ["Detective Stone is old, sharp, and tired. He holds a cracked pocket watch.", "'Do not ask if this place is impossible,' he says. 'Ask who is lying.'", "His watch is stopped at 11:47."],
    choices: [
      { label: "Ask about his case", next: "stoneCase", fx: { smart: 1 }, trust: { stone: 1 }, clue: "Stone's Case" },
      { label: "Ask about the watch", next: "stoneWatch", fx: { smart: 1 }, trust: { stone: 1 }, clue: "Broken Watch" },
      { label: "Talk to someone else", next: "beforeMidnight", fx: { alert: 1 } },
    ],
  },

  stoneCase: {
    chapter: "Chapter One",
    title: "The Old Case",
    place: "Passenger Car",
    art: "stone",
    text: ["Stone leans closer.", "'Ten years ago, a train vanished. The file said accident. But there was no wreck. No bodies. No train.'", "He looks at Alex. 'Your mother was on my list.'"],
    choices: [
      { label: "Ask him to help you", next: "beforeMidnight", fx: { kind: 1, memory: 1 }, trust: { stone: 2 }, clue: "Stone Investigated Mom" },
      { label: "Ask how to find the truth", next: "beforeMidnight", fx: { smart: 2 }, trust: { stone: 1 }, clue: "Three Questions" },
    ],
  },

  stoneWatch: {
    chapter: "Chapter One",
    title: "11:47",
    place: "Passenger Car",
    art: "watch",
    text: ["The watch is stopped at 11:47.", "'It stops before something bad happens,' Stone says. 'Not during. Before.'", "He taps the glass. 'Remember that.'"],
    choices: [{ label: "Remember the warning", next: "beforeMidnight", fx: { smart: 2, alert: 1 }, clue: "Watch Warning" }],
  },

  finn: {
    chapter: "Chapter One",
    title: "Finn Fox",
    place: "Passenger Car",
    art: "finn",
    text: ["Finn Fox is young, stylish, and far too calm. He wears black gloves and a bright smile.", "'Alex Vale,' he says. 'I wondered when you would finally get here.'", "Alex never told him their name."],
    choices: [
      { label: "Ask how he knows your name", next: "finnDebt", fx: { alert: 1 }, trust: { finn: -1 }, clue: "Finn Knows Too Much" },
      { label: "Ask him to remove his gloves", next: "ringReveal", fx: { brave: 1, alert: 1 }, trust: { finn: -2 } },
      { label: "Play along and smile", next: "finnDebt", fx: { sneaky: 1 }, trust: { finn: 1 } },
    ],
  },

  finnDebt: {
    chapter: "Chapter One",
    title: "What the Train Takes",
    place: "Passenger Car",
    art: "finn",
    text: ["Finn lowers his voice.", "'Everyone here owes the train something. A secret. A name. A life. Your mother owed it an ending.'", "The lights flicker like the train heard him."],
    choices: [
      { label: "Ask what your mother chose", next: "beforeMidnight", fx: { memory: 1, alert: 1 }, clue: "Mom Owed an Ending" },
      { label: "Ask what Finn owes", next: "beforeMidnight", fx: { alert: 1 }, trust: { finn: -1 }, clue: "Finn's Debt" },
    ],
  },

  ringReveal: {
    chapter: "Chapter One",
    title: "The Silver Ring",
    place: "Passenger Car",
    art: "ring",
    text: ["Alex grabs Finn's wrist. The glove slips.", "A silver ring shines on his finger. It has the same eye mark as Alex's ticket.", "Finn whispers, 'Your mother should have warned you better.'"],
    choices: [{ label: "Mark Finn as dangerous", next: "beforeMidnight", fx: { alert: 2 }, trust: { finn: -2 }, clue: "Finn's Ring", flag: "ringSeen" }],
  },

  alone: {
    chapter: "Chapter One",
    title: "The Window Seat",
    place: "Passenger Car",
    art: "windowSeat",
    text: ["Alex sits alone by the window. The glass is ice cold.", "Outside, a woman stands on a dark platform. She looks like Alex's mother.", "She presses one hand to the glass from the other side."],
    choices: [
      { label: "Touch the glass", next: "beforeMidnight", fx: { memory: 2 }, clue: "Mother at Window" },
      { label: "Write it down", next: "beforeMidnight", fx: { smart: 1 }, clue: "Woman on Platform" },
    ],
  },

  nameless: {
    chapter: "Chapter One",
    title: "The Nameless Seat",
    place: "Passenger Car",
    art: "emptySeat",
    text: ["Alex sits in the seat with no name. The air turns cold.", "An empty voice whispers beside them: 'You should have waited.'", "The other passengers stop talking."],
    choices: [
      { label: "Ask who is there", next: "beforeMidnight", fx: { brave: 1, memory: 1 }, clue: "Empty Voice" },
      { label: "Stand up quickly", next: "beforeMidnight", fx: { smart: 1, brave: -1 }, flag: "leftNameless" },
    ],
  },

  musicBox: {
    chapter: "Chapter One",
    title: "The Music Box",
    place: "Passenger Car • 11:54 PM",
    art: "musicBox",
    text: ["Luna places the music box on the table.", "It has four signs: bell, eye, key, and star.", "'It opens with the right order,' Luna says. 'But it hates guesses.'"],
    choices: [
      { label: "Use Bell → Eye → Key → Star", next: "boxOpen", fx: { smart: 2, memory: 1 }, trust: { luna: 2 }, clue: "Photo in Box", flag: "musicBoxDone" },
      { label: "Force it open", next: "boxBroken", fx: { brave: 1 }, trust: { luna: -3 }, flag: "musicBoxDone" },
      { label: "Give it back unopened", next: "boxReturned", fx: { kind: 2 }, trust: { luna: 2 }, flag: "musicBoxDone" },
    ],
  },

  boxOpen: {
    chapter: "Chapter One",
    title: "The Photo",
    place: "Passenger Car",
    art: "musicBox",
    text: ["The box opens. Inside is an old photo.", "Alex's mother stands beside Luna on a snowy platform. The photo is ten years old, but Luna looks the same age as now.", "On the back, someone wrote: She chose the child."],
    choices: [{ label: "Ask Luna what it means", next: "beforeMidnight", fx: { memory: 2, alert: 1 }, trust: { luna: 1 }, clue: "Mom Chose Alex" }],
  },

  boxBroken: {
    chapter: "Chapter One",
    title: "Broken Song",
    place: "Passenger Car",
    art: "musicBox",
    text: ["Alex forces the lid. The music stops. Everyone looks over.", "Luna pulls the box away. 'You cannot break a memory and expect the truth.'", "A torn photo falls out. It shows Alex's mother's hand wearing a ring Alex has never seen."],
    choices: [{ label: "Take the photo piece", next: "beforeMidnight", fx: { alert: 1, memory: 1 }, clue: "Mom's Hidden Ring", trust: { luna: -1 } }],
  },

  boxReturned: {
    chapter: "Chapter One",
    title: "A Small Key",
    place: "Passenger Car",
    art: "musicBox",
    text: ["Alex gives the box back.", "Luna looks surprised. 'Thank you.'", "She slips a tiny key into Alex's hand. The key has no teeth."],
    choices: [{ label: "Keep the key", next: "beforeMidnight", fx: { kind: 1, smart: 1 }, trust: { luna: 2 }, clue: "Toothless Key", flag: "toothlessKey" }],
  },

  beforeMidnight: {
    chapter: "Chapter One",
    title: "Before Midnight",
    place: "Passenger Car • 11:51 PM",
    art: "carriage",
    text: ["The car grows quiet. A bell rings once. The lights dim, then return.", "Midnight is close. Alex has time for one more move before the train changes."],
    choices: [
      { label: "Try Luna's music box", next: "musicBox", fx: { smart: 1 }, trust: { luna: 1 }, condition: (s) => !s.flags.musicBoxDone },
      { label: "Ask Stone for help", next: "stone", fx: { smart: 1 }, trust: { stone: 1 }, condition: (s) => !s.flags.satStone },
      { label: "Watch Finn's gloves", next: "ringReveal", fx: { alert: 1 }, condition: (s) => !s.flags.ringSeen },
      { label: "Get ready for midnight", next: "midnight", fx: { brave: 1 }, flag: "readyMidnight" },
    ],
  },

  midnight: {
    chapter: "Chapter One",
    title: "Midnight",
    place: "Passenger Car • 12:00 AM",
    art: "midnight",
    text: ["At 11:58, the lights dim. At 11:59, Mr. Gray enters the car. Every passenger shows a ticket.", "A nervous boy named Tommy Reed checks his pockets. 'I had mine,' he says. 'I swear I had it.'", "The train enters a tunnel. The clock strikes midnight. The lights go out. Tommy screams."],
    choices: [
      { label: "Reach for Tommy", next: "grabTommy", fx: { brave: 2 }, trust: { gray: -1 }, clue: "Tommy Was Cold" },
      { label: "Watch the other passengers", next: "watchFaces", fx: { smart: 2 }, clue: "Passenger Reactions" },
      { label: "Protect your ticket", next: "protectTicket", fx: { alert: 1, brave: 1 }, flag: "protectedTicket" },
      { label: "Call out for your mother", next: "callMom", fx: { memory: 2 }, trust: { gray: -1 } },
    ],
  },

  grabTommy: {
    chapter: "Chapter One",
    title: "A Sleeve in the Dark",
    place: "Passenger Car",
    art: "dark",
    text: ["Alex grabs Tommy's sleeve as the lights go out. His arm is freezing cold.", "When the lights return, Tommy is gone. Alex is holding an empty sleeve."],
    choices: [{ label: "Keep the sleeve as proof", next: "missing", fx: { brave: 1, smart: 1 }, clue: "Empty Sleeve" }],
  },

  watchFaces: {
    chapter: "Chapter One",
    title: "Who Knew?",
    place: "Passenger Car",
    art: "faces",
    text: ["Before the lights fail, Alex watches everyone.", "Luna closes her eyes before the scream. Stone checks his watch. Finn looks at Alex, not Tommy. Mr. Gray looks at no one."],
    choices: [
      { label: "Remember Stone's watch", next: "missing", fx: { smart: 2 }, clue: "Stone Checked Watch" },
      { label: "Remember Finn watched you", next: "missing", fx: { alert: 2 }, clue: "Finn Watched Alex" },
      { label: "Remember Luna expected it", next: "missing", fx: { alert: 1, kind: 1 }, clue: "Luna Expected It" },
    ],
  },

  protectTicket: {
    chapter: "Chapter One",
    title: "The Ticket Burns",
    place: "Passenger Car",
    art: "ticket",
    text: ["Alex holds the ticket tight. It burns cold in their hand.", "When the lights return, Tommy is gone. A second eye-shaped hole has appeared in Alex's ticket."],
    choices: [{ label: "Show it to Stone", next: "missing", fx: { smart: 1 }, trust: { stone: 2 }, clue: "Second Eye Hole" }],
  },

  callMom: {
    chapter: "Chapter One",
    title: "A Voice Answers",
    place: "Passenger Car",
    art: "memory",
    text: ["Alex calls out their mother's name in the dark.", "A voice answers from under the floor: 'Not him. Not yet.'", "Then Tommy screams. When the lights return, his seat is empty."],
    choices: [{ label: "Search under Tommy's seat", next: "missing", fx: { memory: 1, smart: 1 }, clue: "Voice Under Floor" }],
  },

  missing: {
    chapter: "Chapter One",
    title: "Tommy Is Gone",
    place: "Passenger Car • 12:04 AM",
    art: "missing",
    text: ["Tommy's seat is empty. On the window, written in water from the inside, are the words: ONE OF YOU IS ALREADY HOME.", "Mr. Gray says the next station is close. Alex has time to check only three clues.", "Choose carefully. Each clue can open or close a future ending."],
    choices: [
      { label: "Check Tommy's seat", next: "clueSeat", fx: { smart: 1 }, clue: "Ticket Piece", flag: "clueSeat", condition: (s) => !s.flags.clueSeat },
      { label: "Check the window message", next: "clueWindow", fx: { alert: 1 }, clue: "Inside Water", flag: "clueWindow", condition: (s) => !s.flags.clueWindow },
      { label: "Check Finn's glove", next: "clueFinn", fx: { alert: 1 }, clue: "Ring After Midnight", flag: "clueFinn", condition: (s) => !s.flags.clueFinn },
      { label: "Check Luna's music box", next: "clueLuna", fx: { kind: 1, alert: 1 }, clue: "Box Played Alone", flag: "clueLuna", condition: (s) => !s.flags.clueLuna },
      { label: "Check Stone's watch", next: "clueStone", fx: { smart: 1 }, clue: "Watch at 11:47", flag: "clueStone", condition: (s) => !s.flags.clueStone },
      { label: "Go to the next stop", next: "stationFinal", fx: { brave: 1 }, condition: (s) => countFlags(s, "clue") >= 2 },
    ],
  },

  clueSeat: { chapter: "Chapter One", title: "Tommy's Seat", place: "Passenger Car", art: "emptySeat", text: ["Under Tommy's seat, Alex finds a torn ticket piece.", "It is not Tommy's. It has Alex's initials on it."], choices: [{ label: "Keep investigating", next: "missing", fx: { smart: 1 } }] },
  clueWindow: { chapter: "Chapter One", title: "The Wet Words", place: "Passenger Car Window", art: "windowSeat", text: ["The words look like they were written from outside, but the water is on the inside.", "When Alex touches the glass, the message changes: ONE OF YOU NEVER LEFT."], choices: [{ label: "Keep investigating", next: "missing", fx: { alert: 1 } }] },
  clueFinn: { chapter: "Chapter One", title: "Finn's Ring", place: "Passenger Car", art: "ring", text: ["Finn fixes his glove too late. Alex sees the silver ring clearly now.", "It has an eye mark inside a circle of thorns."], choices: [{ label: "Keep investigating", next: "missing", fx: { alert: 1 }, trust: { finn: -1 } }] },
  clueLuna: { chapter: "Chapter One", title: "The Box Plays Alone", place: "Passenger Car", art: "musicBox", text: ["Luna's music box plays without being touched.", "Alex knows the song. Their mother used to hum it during storms."], choices: [{ label: "Keep investigating", next: "missing", fx: { memory: 1 }, trust: { luna: 1 } }] },
  clueStone: { chapter: "Chapter One", title: "11:47 Again", place: "Passenger Car", art: "watch", text: ["Stone's watch did not stop at midnight. It stopped at 11:47.", "Stone says, 'Then Tommy started vanishing before we saw it happen.'"], choices: [{ label: "Keep investigating", next: "missing", fx: { smart: 1 }, trust: { stone: 1 } }] },

  stationFinal: {
    chapter: "Chapter One Finale",
    title: "Black Hollow, 1896",
    place: "Black Hollow Station • 12:11 AM",
    art: "blackHollow",
    text: ["The train stops at an old gaslit station. Rain falls upward into the sky.", "On the platform stands a woman Alex knows from photos, dreams, and grief.", "Alex's mother is alive. She looks older. She looks scared. And she is staring right at Alex."],
    choices: [
      { label: "Run to your mother", next: "c2_mother", fx: { brave: 2, memory: 2 } },
      { label: "Stay on the train and keep investigating", next: "c2_train", fx: { smart: 2 } },
      { label: "Ask Luna if she sees her", next: "c2_luna", fx: { kind: 2 }, trust: { luna: 2 } },
      { label: "Accuse Finn", next: "c2_finn", fx: { alert: 2 }, trust: { finn: -2 } },
      { label: "Follow Stone into the next car", next: "c2_stone", fx: { smart: 2 }, trust: { stone: 2 } },
    ],
  },

  c2_mother: { chapter: "Chapter Two", title: "The Lost Platform", place: "Black Hollow Station", art: "motherPlatform", text: ["Alex jumps onto the platform. The train doors shut behind them.", "Their mother grabs their hand. 'No time,' she says. 'If Gray finds us first, we lose our chance.'", "She looks tired, older, and very real."], choices: [{ label: "Go with your mother", next: "c2_square", fx: { memory: 1, kind: 1 }, clue: "Mom Wants the Records" }, { label: "Ask what happened to Tommy", next: "c2_tommy", fx: { alert: 1, smart: 1 } }] },
  c2_train: { chapter: "Chapter Two", title: "The Empty Seat", place: "Passenger Car", art: "emptySeat", text: ["Alex stays on the train. Their mother watches from the platform, then fades into the rain.", "Tommy's empty seat creaks.", "A voice whispers, 'If you want him back, get off at Black Hollow and find the station records.'"], choices: [{ label: "Follow the voice off the train", next: "c2_square", fx: { alert: 1, brave: 1 }, clue: "Voice Wanted Records" }] },
  c2_luna: { chapter: "Chapter Two", title: "Luna's Secret", place: "Passenger Car", art: "luna", text: ["Alex turns to Luna. 'Do you see her?'", "Luna's eyes fill with tears. 'I see the woman I failed.'", "Her music box opens by itself. Inside is a folded map."], choices: [{ label: "Take the map and go with Luna", next: "c2_square", fx: { kind: 1, memory: 1 }, trust: { luna: 1 }, clue: "Map of Black Hollow" }] },
  c2_finn: { chapter: "Chapter Two", title: "The Silver Ring", place: "Passenger Car", art: "finn", text: ["Alex points at Finn. 'You know what happened to Tommy.'", "Finn removes one glove. The silver ring shines like an open eye.", "'Yes,' he says. 'And if you want your mother to survive, you need me.'"], choices: [{ label: "Hear Finn out", next: "c2_square", fx: { alert: 1, sneaky: 1 }, trust: { finn: 1 }, clue: "Finn Wants the Ledger" }] },
  c2_stone: { chapter: "Chapter Two", title: "The Locked Case", place: "Between Cars", art: "stone", text: ["Detective Stone walks toward the next car. Alex follows.", "'Good choice,' he says. 'Never give a mystery the answer it begs for.'", "He unlocks a luggage door. Inside is a wall full of papers, maps, and names."], choices: [{ label: "Search the case board with Stone", next: "c2_square", fx: { smart: 2 }, trust: { stone: 2 }, clue: "Station House Matters" }] },
  c2_tommy: { chapter: "Chapter Two", title: "Between Stops", place: "Black Hollow Platform", art: "motherPlatform", text: ["'Tommy is not dead,' Alex's mother says.", "'He slipped between stops. That can happen here.'", "'If we find the records, we may still bring him back.'"], choices: [{ label: "Go into town", next: "c2_square", fx: { memory: 1, kind: 1 }, clue: "Tommy Between Stops" }] },

  c2_square: {
    chapter: "Chapter Two",
    title: "Black Hollow",
    place: "Town Square",
    art: "blackHollow",
    text: ["Black Hollow is quiet and wrong.", "The clock tower stands frozen at 11:47. The station office is dark. The old hotel leans over the square like it is listening.", "Alex needs at least two strong clues before going to the station house."],
    choices: [
      { label: "Search the station office", next: "c2_office", fx: { smart: 1 }, condition: (s) => !s.flags.c2Office },
      { label: "Go to the clock yard", next: "c2_yard", fx: { alert: 1 }, condition: (s) => !s.flags.c2Yard },
      { label: "Enter the old hotel", next: "c2_hotel", fx: { brave: 1 }, condition: (s) => !s.flags.c2Hotel },
      { label: "Go to the station house", next: "c2_stationDoor", fx: { smart: 1 }, condition: (s) => countFlags(s, "c2") >= 2 },
    ],
  },

  c2_office: { chapter: "Chapter Two", title: "Station Office", place: "Records Office", art: "notes", text: ["Dust covers the office. Papers are everywhere. A torn town map hangs on the wall.", "On the desk sits a thick ledger. Several pages have been ripped out."], choices: [{ label: "Read the ledger", next: "c2_square", fx: { smart: 2, memory: 1 }, flag: "c2Office", clue: "Ledger: Bell Eye Key Star" }, { label: "Study the map", next: "c2_square", fx: { alert: 1, memory: 1 }, flag: "c2Office", clue: "Mom Marked the Hotel" }] },
  c2_yard: { chapter: "Chapter Two", title: "Clock Yard", place: "Clock Yard", art: "clock", text: ["The clock tower rises over the yard. The hands are stuck at 11:47.", "Somewhere nearby, Alex hears Tommy's voice calling for help."], choices: [{ label: "Climb the tower", next: "c2_square", fx: { brave: 1, smart: 1 }, flag: "c2Yard", clue: "11:47 Is the Crack" }, { label: "Follow Tommy's voice", next: "c2_square", fx: { alert: 1, memory: 1 }, flag: "c2Yard", clue: "Tommy Said Find My Name" }] },
  c2_hotel: { chapter: "Chapter Two", title: "The Old Hotel", place: "Old Hotel", art: "hotel", text: ["The hotel lobby smells like dust and rain.", "A guest book lies open on the desk. A staircase leads up to Room 7."], choices: [{ label: "Check the guest book", next: "c2_square", fx: { smart: 1, memory: 1 }, flag: "c2Hotel", clue: "Mom Asked for Room 7" }, { label: "Go to Room 7", next: "c2_square", fx: { brave: 1, memory: 2 }, flag: "c2Hotel", clue: "Mom Chose Alex" }] },

  c2_stationDoor: {
    chapter: "Chapter Two",
    title: "The Station House Door",
    place: "Station House",
    art: "doorSeven",
    text: ["The station house door has four metal symbols on it.", "Bell. Eye. Key. Star.", "Alex needs the right order."],
    choices: [
      { label: "Bell → Eye → Key → Star", next: "c2_reveal", fx: { smart: 2 }, clue: "Opened Station House" },
      { label: "Force the door open", next: "c2_reveal", fx: { brave: 1, alert: 1 } },
    ],
  },

  c2_reveal: {
    chapter: "Chapter Two",
    title: "The Truth",
    place: "Station House",
    art: "stationHouse",
    text: ["The files tell the story Alex never knew.", "The night Alex's mother vanished, she made a deal with the train. She stayed behind so Alex would stay safe.", "Tommy is trapped between stops. Car Seven is still waiting. And now the town wants Alex instead."],
    choices: [
      { label: "Follow your mother's plan", next: "endMother", fx: { memory: 2, kind: 1 } },
      { label: "Trust Luna's promise", next: "endLuna", fx: { kind: 2 } },
      { label: "Take Finn's risky deal", next: "endFinn", fx: { sneaky: 2, alert: 1 } },
      { label: "Work with Stone", next: "endStone", fx: { smart: 2 } },
      { label: "Listen to Mr. Gray", next: "endGray", fx: { alert: 2 } },
    ],
  },

  endMother: { ending: true, endingTitle: "Chapter Three Unlocked: Mother's Path", chapter: "Chapter Two Complete", title: "The Promise", place: "Station House", art: "motherPlatform", text: ["Alex folds the file shut.", "Their mother says, 'Then we finish what I started.'", "Outside, the bell in the clock tower begins to ring."], choices: [] },
  endLuna: { ending: true, endingTitle: "Chapter Three Unlocked: Luna's Promise", chapter: "Chapter Two Complete", title: "The Promise Returns", place: "Station House", art: "luna", text: ["Luna places one hand on the file.", "'I failed once,' she says. 'I will not fail again.'", "Her music box begins to play on its own."], choices: [] },
  endFinn: { ending: true, endingTitle: "Chapter Three Unlocked: Finn's Deal", chapter: "Chapter Two Complete", title: "The Dangerous Way", place: "Station House", art: "finn", text: ["Finn smiles, but not warmly.", "'Good,' he says. 'The safe road never works on this train anyway.'", "He slips the silver ring back on."], choices: [] },
  endStone: { ending: true, endingTitle: "Chapter Three Unlocked: Stone's File", chapter: "Chapter Two Complete", title: "The Investigator's Road", place: "Station House", art: "stone", text: ["Stone takes the file and tucks it under his arm.", "'Now we stop guessing,' he says. 'Now we build the case.'", "He points toward the tunnel under the station."], choices: [] },
  endGray: { ending: true, endingTitle: "Chapter Three Unlocked: Gray's Offer", chapter: "Chapter Two Complete", title: "The Conductor's Smile", place: "Station House", art: "gray", text: ["Mr. Gray steps out of the dark as if he had been there all along.", "'At last,' he says. 'A passenger ready to hear the real rules.'", "He opens one gloved hand. Inside lies a key marked 7."], choices: [] },
};

function applyChoice(state: GameState, choice: Choice): GameState {
  const next: GameState = {
    ...state,
    stats: { ...state.stats },
    trust: { ...state.trust },
    clues: [...state.clues],
    flags: { ...state.flags },
    history: [...state.history, choice.label],
  };

  if (choice.fx) {
    for (const key of Object.keys(choice.fx) as StatKey[]) {
      next.stats[key] = clamp(next.stats[key] + (choice.fx[key] || 0));
    }
  }

  if (choice.trust) {
    for (const key of Object.keys(choice.trust) as PersonKey[]) {
      next.trust[key] = clamp(next.trust[key] + (choice.trust[key] || 0));
    }
  }

  if (choice.clue && !next.clues.includes(choice.clue)) next.clues.push(choice.clue);
  if (choice.flag) next.flags[choice.flag] = true;
  return next;
}

const artLabels: Record<string, string> = {
  station: "Old North Station",
  train: "The Midnight Rail",
  shadow: "The Shadow",
  pin: "Silver Pin",
  ticket: "The Ticket",
  symbols: "Four Signs",
  letter: "The Letter",
  gray: "Mr. Gray",
  stationDark: "The Loop",
  hall: "Train Hall",
  doorSeven: "Car Seven",
  phone: "Phone Message",
  oldStation: "Black Hollow 1896",
  recording: "Not Yet",
  carriage: "Passenger Car",
  luna: "Luna Bell",
  stone: "Detective Stone",
  finn: "Finn Fox",
  watch: "11:47",
  clock: "Clock Tower",
  notes: "The Records",
  ring: "Silver Ring",
  musicBox: "The Music Box",
  windowSeat: "The Window Seat",
  emptySeat: "The Empty Seat",
  memory: "Memory",
  midnight: "Midnight",
  dark: "The Scream",
  faces: "Who Knew?",
  missing: "Tommy Is Gone",
  nextStop: "Next Stop",
  blackHollow: "Black Hollow",
  motherPlatform: "Mother on the Platform",
  hotel: "The Old Hotel",
  stationHouse: "Station House",
};

type AssetKey =
  | "station"
  | "carriage"
  | "town"
  | "records"
  | "gray"
  | "luna"
  | "stone"
  | "finn";

const assetFiles: Record<AssetKey, string> = {
  station: "/assets/old-north-station.png",
  carriage: "/assets/midnight-carriage.png",
  town: "/assets/black-hollow-square.png",
  records: "/assets/station-records-room.png",
  gray: "/assets/mr-gray.png",
  luna: "/assets/luna-bell.png",
  stone: "/assets/detective-stone.png",
  finn: "/assets/finn-fox.png",
};

function getSceneAsset(type: string): AssetKey {
  if (["gray"].includes(type)) return "gray";
  if (["luna", "musicBox"].includes(type)) return "luna";
  if (["stone", "watch"].includes(type)) return "stone";
  if (["finn", "ring"].includes(type)) return "finn";

  if (["blackHollow", "motherPlatform", "oldStation", "hotel", "clock"].includes(type)) return "town";
  if (["notes", "stationHouse", "letter", "ticket", "symbols", "pin", "phone", "recording", "memory"].includes(type)) return "records";
  if (["hall", "doorSeven", "carriage", "midnight", "dark", "faces", "missing", "nextStop", "emptySeat", "windowSeat"].includes(type)) return "carriage";

  return "station";
}

function Art({ type }: { type: string }) {
  const label = artLabels[type] || "Midnight Rail";
  const assetKey = getSceneAsset(type);
  const src = assetFiles[assetKey];
  const isCharacter = ["gray", "luna", "stone", "finn"].includes(assetKey);

  return (
    <div className={`art imageArt ${isCharacter ? "characterArt" : "backgroundArt"}`}>
      <img src={src} alt={label} />
      <div className="artShade" />
      <div className="artCaption">{label}</div>
    </div>
  );
}

function SidePanel({ game }: { game: GameState }) {
  return <aside className="side">
    <div className="panel"><h3>Alex's Traits</h3><div className="stats">{(Object.keys(game.stats) as StatKey[]).map((key) => <div className="stat" key={key}><div className="statTop"><span>{statInfo[key].icon} {statInfo[key].label}</span><b className={game.stats[key] > 0 ? "good" : game.stats[key] < 0 ? "bad" : ""}>{game.stats[key] > 0 ? "+" : ""}{game.stats[key]}</b></div><div className="bar"><div style={{ width: `${((game.stats[key] + 10) / 20) * 100}%` }} /></div></div>)}</div></div>
    <div className="panel"><h3>Clues <span>{game.clues.length}</span></h3>{game.clues.length === 0 ? <p className="muted">No clues yet.</p> : <div className="chips">{game.clues.map((c) => <span key={c}>{c}</span>)}</div>}</div>
    <div className="panel"><h3>Trust</h3><div className="trustList">{(Object.keys(game.trust) as PersonKey[]).map((key) => <div className="trust" key={key}><div><b>{people[key].label}</b><small>{people[key].desc}</small></div><strong className={game.trust[key] > 0 ? "good" : game.trust[key] < 0 ? "bad" : ""}>{game.trust[key] > 0 ? "+" : ""}{game.trust[key]}</strong></div>)}</div></div>
    <div className="panel"><h3>Recent Choices</h3>{game.history.length === 0 ? <p className="muted">No choices yet.</p> : <div className="history">{game.history.slice(-5).reverse().map((item, i) => <div key={`${item}-${i}`}>{item}</div>)}</div>}</div>
  </aside>;
}

function StartScreen({ onStart }: { onStart: () => void }) {
  return <div className="startPage"><div className="startGrid"><section className="hero"><div><div className="badge">🚆 Mystery Adventure Game</div><h1>Midnight Rail</h1><h2>The Lost Stop</h2><p>A simple, cinematic mystery game. Board the train, meet strange passengers, collect clues, and choose which path opens next.</p></div><div className="heroCards"><div><b>Easy words</b><span>Clear story for all audiences.</span></div><div><b>Big choices</b><span>Every action changes something.</span></div><div><b>Many routes</b><span>Replay to unlock new endings.</span></div></div></section><section className="ticketBox"><Art type="train"/><div className="ticketInfo"><div className="ticketIcon">🎫</div><div><small>Ticket</small><b>Alex Vale</b></div></div><ul><li>🕚 Time: 11:07 PM</li><li>🚆 Train: The Midnight Rail</li><li>⚠️ Rule: Do not sleep before midnight</li></ul><button className="primaryBtn" onClick={onStart}>Start Chapter One →</button></section></div></div>;
}

function GameScreen({ game, setGame, sceneId, setSceneId, restart }: { game: GameState; setGame: React.Dispatch<React.SetStateAction<GameState>>; sceneId: string; setSceneId: React.Dispatch<React.SetStateAction<string>>; restart: () => void }) {
  const scene = scenes[sceneId] || scenes.start;
  const choices = scene.choices.filter((c) => !c.condition || c.condition(game));
  const progress = Math.min(100, Math.round((game.history.length / 42) * 100));
  function choose(choice: Choice) { setGame((current) => applyChoice(current, choice)); setSceneId(choice.next); }
  return <div className="gamePage"><header className="topBar"><div><div className="chapter">🚆 {scene.chapter}</div><h1>{scene.title}</h1><p>{scene.place}</p></div><div className="topActions"><div className="progressBox"><span>Progress</span><div className="progress"><div style={{ width: `${progress}%` }} /></div></div><button className="outlineBtn" onClick={restart}>↻ Restart</button></div></header><div className="gameGrid"><main><Art type={scene.art}/><section className="storyCard">{scene.text.map((line, i) => <p key={i}>{line}</p>)}{scene.ending ? <div className="endingBox"><h3>{scene.endingTitle}</h3><p>This is your route. Restart to find a different path.</p><button className="primaryBtn" onClick={restart}>Restart Story</button></div> : <div className="choices">{choices.map((choice) => <button key={choice.label} onClick={() => choose(choice)}><span>{choice.label}</span><b>→</b></button>)}</div>}</section></main><SidePanel game={game}/></div></div>;
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [sceneId, setSceneId] = useState("start");
  const [game, setGame] = useState<GameState>(() => freshGame());
  const restart = () => { setStarted(false); setSceneId("start"); setGame(freshGame()); };
  if (!started) return <StartScreen onStart={() => setStarted(true)} />;
  return <GameScreen game={game} setGame={setGame} sceneId={sceneId} setSceneId={setSceneId} restart={restart} />;
}
