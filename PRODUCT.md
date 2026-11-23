# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

One web app (`web/src`, built to `web/index.html`) runs in thin native shells: Android APK, unsigned iPhone app, Windows desktop app. Phone, tablet and PC share the code; tablet and PC have their own layouts.

## Users

Everyone who wants a calm overview of their money. No group takes priority when decisions conflict, so the app adapts to whoever uses it:

- households and families with little time, who track spending, fixed costs and savings;
- employees, who handle salary, Werbungskosten and tax;
- self-employed people, alone or next to a job, who write invoices, handle VAT and hand over to a tax advisor;
- people on a tight budget (Bürgergeld, Grundsicherung, job seekers), for whom every euro counts.

## Product Purpose

Finanz MAMI is a personal finance app (Haushaltsbuch) that looks after its user. It keeps every account, booking, fixed cost, saving goal, tax topic and, for the self-employed, the whole business side (invoices, quotes, e-invoices, payment matching, dunning, VAT return, DATEV export) in one place. Success means the user knows where they stand without having to understand finance.

## Positioning

"Mami" is a caring, motherly assistant who speaks to the user, reminds them in time, explains things and does the work: it prepares due invoices, matches payments, reads official letters. Data stays on the user's devices; devices pair by QR code without an account, with end-to-end encrypted sync. No extra app is required for anything.

Slogans: "Meine Ausgaben, Meine Info" and "Die App die sich um dich kümmert".

## Operating Context

- Used on the phone on the go, and on PC or tablet for bigger tasks (invoices, tax, exports).
- Bank statements come in by import or bank link. Receipts and letters come in as photos or PDFs, read on the device by OCR.
- Several people can share a household ("Gemeinsam"), with up to 10 paired devices and one main device.
- Updates come from the app's own check; testers get it through personal invite codes.

## Capabilities and Constraints

- 8 languages: de, en, tr, ru, uk, pl, ar, ro. Arabic keeps the left-to-right layout on purpose; only the text is Arabic. Every text and every Mami tour exists in all of them, and Mami's name is translated per language.
- Colors are user-customizable. Every color comes from CSS variables.
- Every change also updates the Mami tours ("Neu" tour, guided tours).
- Animations and light sounds are part of the character; they can be turned off and respect reduced motion.
- No account, no third-party app installs, no ads.
- Undecided: final pricing model (one-time purchase, PC licence or subscription) and app-store release.

## Brand Commitments

- The name is written exactly "Finanz MAMI".
- Logo: the owner's own mark, a mother figure with a piggy bank, shown white on green or with a green-blue gradient. Use it 1:1 and do not redraw it.
- Voice: warm and motherly ("mein Schatz"); Mami cares, reassures and never lectures.
- Version shown lowercase, e.g. v0.48.3.
- Published material uses demo or fictional data, never the owner's real finances. The public contact is kontakt@miracleframe.de.

## Evidence on Hand

- Logo files are in `branding/`.
- There are no testimonials, user numbers or press yet. Nothing like that may be invented.

## Product Principles

1. Mami does the work, the user confirms. Prepare, suggest and remind instead of asking people to fill in forms.
2. Plain language first. Explain every number in everyday words, with no jargon and no finance knowledge assumed.
3. One app for every life situation. Job, business and household sit side by side without mode switches.
4. The user's data belongs to the user. It stays on their own devices, with no account and no lock-in.
5. Warmth with precision. The tone is friendly, but amounts, deadlines and legal formats must be exact.

## Accessibility & Inclusion

- Plain language everywhere (einfache Sprache).
- Large, readable type for older users and weaker eyes. Layouts must hold with enlarged text.
- Colorblind-safe: never show meaning by red or green alone. Pair color with an icon, a word or a shape.
- Arabic text must read well; the layout deliberately stays left-to-right (owner decision).
- Reduced motion is respected, and sounds can be switched off.
