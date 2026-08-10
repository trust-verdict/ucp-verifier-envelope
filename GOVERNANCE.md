# Governance

This org owns one thing: the neutral **verifier-attestation envelope** and its
conformance requirements. It owns nothing about what any individual claim means.

## What the org governs

- The envelope: the Signals entry shape, the trust model, the verifier and
  consumer responsibilities, and the conformance bar a profile must clear to be
  listed in the registry.
- The registry itself: which signals are listed, and the entry evidence each
  one shipped (a runnable verifier over committed vectors, per section 8 of the
  envelope spec).

Changes to the envelope or the conformance bar are decided by the maintainers
together. No single maintainer, and no single maintainer's company, decides them
alone.

## What the org does NOT govern

- **The meaning of a claim type stays with the issuer who owns its profile.**
  What `risk` asserts, what `identity` asserts, what a `decision-provenance`
  receipt binds to and for how long: that is defined in the issuer's own,
  externally versioned profile, and only that issuer changes it. The registry
  references a profile that meets the bar; it does not take ownership of the
  profile's semantics, and it cannot redefine a claim by committee.
- **An issuer's keys, verifier, and production service.** Those live with the
  issuer and never transfer here.

## Why this split

The whole proposal rests on the envelope being neutral of every party while each
verdict stays the responsibility of the party that signs it. If the org could
redefine what a claim means, it would become a party to the claim, which is
exactly the position an external verifier must never hold. Keeping envelope
governance here and claim semantics with each issuer is what lets "neutral" be
true rather than asserted.

## Maintainers

The org is co-maintained by the independent issuers who have shipped a
conformant profile. Being a maintainer of the envelope carries no weight over
another issuer's profile. Adding or removing a maintainer is a decision of the
current maintainers together.

## When the maintainers do not agree

Everything above says how a decision gets made. It says nothing about what
happens when one does not, and the realistic failure there is not an argument.
It is drift: a proposal sits, nobody merges it, nobody rejects it, and the bar
quietly becomes whatever the last merged PR happened to say. Nobody decided
that, which is exactly the problem, because it means the envelope can move
without anyone being accountable for moving it.

**There is no tiebreaker.** Deadlock resolves to the status quo. Inventing a
casting vote would hand one maintainer the power to move the envelope or the bar
alone, which is the single thing the rest of this document exists to prevent,
and it would be worth less than the neutrality it spent. So a proposal is not
adopted by patience and it is not rejected by silence.

**The status quo is a decision, so it gets recorded like one.** If a proposal
touching the envelope or the conformance bar has gone 30 days without a
decision, any maintainer may close it with a note saying it was not adopted and
why, or label it as an open disagreement that is deliberately staying open.
Either is fine. Leaving it to rot is not, because an unmerged proposal that
nobody ever ruled on is the drift case wearing a different hat.

**No maintainer merges a change to the envelope or the bar over another
maintainer's stated objection.** An objection has to be written down in the
thread to count, and the maintainer making it owes the others a reason rather
than a veto. This is the positive form of the rule above: together means
together, including when it is inconvenient.

**Absence is not a veto, and it is not consent.** A maintainer who does not
respond cannot freeze the org indefinitely, or a single issuer going quiet
becomes a permanent hold on everyone else. After 30 days, and after an attempt
to reach them has been recorded in the thread, the remaining maintainers may
decide without them. That decision names who was absent. If the absence is
structural rather than temporary, the right fix is the maintainer list, not a
series of decisions taken around someone.

**None of this blocks an issuer's own profile.** Deadlock here is bounded to
what the org actually governs. Claim semantics, keys, verifiers and production
services stay with the issuer, so a stalled envelope proposal never stops
anyone shipping their own claim type. That containment is deliberate, and it is
the reason a deadlock in this org should be survivable rather than fatal.
