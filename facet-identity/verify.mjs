#!/usr/bin/env node
/**
 * Runnable verifier for the COMMITTED identity vectors. This is the entry
 * requirement Section 8 asks of every profile, and it was the one this profile
 * was missing: facet-identity shipped gen-vectors.mjs and mint-live-kya.mjs and
 * no verifier over its own committed bytes, which left it in the conformance
 * gate's paths: list with no job it could run.
 *
 * The distinction that makes this file exist, in Section 8's words: a generator
 * self-validates the bytes it just produced, which proves the generator is
 * internally consistent with itself. It does not prove the bytes committed to
 * the tree, and those are the only bytes a cold reader ever verifies against.
 * So this script regenerates nothing. It loads vectors/vectors.json and
 * vectors/test-jwks.json exactly as committed and re-checks each vector's
 * expected disposition over the artifact.
 *
 *   npm i && node verify.mjs        exit 0 iff every assertion holds
 *
 * Two layers, because identity separates authenticity from scope.
 *
 * Layer 1, authenticity, the verifier's job: is this a genuine, untampered
 * issuer.facet.llc identity token? Pins typ, issuer and alg, resolves the kid
 * against the committed JWKS, checks the signature and the temporal window.
 * Deliberately does NOT check aud.
 *
 * Layer 2, scope, the consumer's job: was it minted for me? The consumer
 * compares the aud claim to its own id and rejects on mismatch. That is why
 * wrong-audience verifies at layer 1 and is rejected at layer 2, and why its
 * signature verifying is the point rather than a hole.
 *
 * No network and no clock dependence: the expired vector's exp is fixed in 2001
 * and the valid vector's runs to 2100, so the outcome is deterministic under any
 * real wall clock.
 *
 * Section 8 also asks that a green run demonstrate the verifier discriminates
 * rather than merely accepts, so the suite asserts at the end that it observed a
 * pass AND every reject reason the profile claims, and fails if any went
 * unexercised.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { jwtVerify, createLocalJWKSet } from "jose";

const HERE = dirname(fileURLToPath(import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(join(HERE, p), "utf8"));

const suite = readJson("vectors/vectors.json");
const testJwks = readJson("vectors/test-jwks.json");
const JWKS = createLocalJWKSet(testJwks);

const ISSUER = "https://issuer.facet.llc";
// The consumer presenting this KYA, i.e. the merchant the valid vector was
// minted for. Held as a constant rather than read back out of the vector so a
// drifted vector set fails loudly here instead of silently agreeing with itself.
const PRESENTED_AUD = "https://merchant.example/ucp";

let pass = 0,
  fail = 0;
const seen = new Set();
const ok = (cond, label, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? "  (" + extra + ")" : ""}`);
};

const jwsOf = (name) => {
  const v = suite.vectors?.[name];
  if (!v?.jws) throw new Error(`committed vector "${name}" is missing from vectors.json`);
  return v.jws;
};

// Layer 1. Authenticity only: typ, issuer, alg, kid, signature, temporal window.
const verifyAuthenticity = (jws) =>
  jwtVerify(jws, JWKS, { typ: "kya+jwt", issuer: ISSUER, algorithms: ["ES256"] });

async function expectValid(name) {
  try {
    const r = await verifyAuthenticity(jwsOf(name));
    ok(true, `${name} -> verifies`);
    seen.add("pass");
    return r;
  } catch (e) {
    ok(false, `${name} -> verifies`, `threw ${e.code ?? e.message}`);
    return null;
  }
}

async function expectReject(name, code) {
  try {
    await verifyAuthenticity(jwsOf(name));
    ok(false, `${name} -> rejected ${code}`, "verified but should have failed");
  } catch (e) {
    const hit = e.code === code;
    ok(hit, `${name} -> rejected ${code}`, e.code ?? e.message);
    if (hit) seen.add(code);
  }
}

// Layer 1: one assertion per committed vector.
const valid = await expectValid("valid");
await expectReject("expired", "ERR_JWT_EXPIRED");
await expectReject("bad-signature", "ERR_JWS_SIGNATURE_VERIFICATION_FAILED");
await expectReject("rotated-key", "ERR_JWKS_NO_MATCHING_KEY");
const wrongAud = await expectValid("wrong-audience");

// Layer 2: the consumer's half of the split. The valid vector was minted for
// this consumer; the wrong-audience vector was minted for a different one and is
// authentic anyway, which is exactly the case the consumer has to catch itself.
ok(
  valid?.payload.aud === PRESENTED_AUD,
  "valid -> consumer aud check passes",
  valid?.payload.aud,
);
ok(
  wrongAud !== null && wrongAud.payload.aud !== PRESENTED_AUD,
  "wrong-audience -> consumer sees aud != its own id, rejects",
  wrongAud?.payload.aud,
);

// And the same rejection through jose's own audience pin, so the consumer check
// is demonstrated as a library-level guarantee and not just a field comparison.
try {
  await jwtVerify(jwsOf("wrong-audience"), JWKS, {
    typ: "kya+jwt",
    issuer: ISSUER,
    algorithms: ["ES256"],
    audience: PRESENTED_AUD,
  });
  ok(false, "wrong-audience -> jose audience pin rejects", "verified but should not");
} catch (e) {
  const hit = e.code === "ERR_JWT_CLAIM_VALIDATION_FAILED";
  ok(hit, "wrong-audience -> jose audience pin rejects", e.code ?? e.message);
  if (hit) seen.add("ERR_JWT_CLAIM_VALIDATION_FAILED");
}

// The agent identity the envelope carries is a key thumbprint, never PII, and
// the committed suite pins it. Assert the valid vector still carries that aid,
// so a regenerated-but-uncommitted drift in the agent key is caught here.
ok(
  typeof valid?.payload.aid === "string" && valid.payload.aid === suite.aid,
  "valid -> aid matches the committed suite aid",
  valid?.payload.aid,
);

// Section 8: a green run must demonstrate discrimination, not mere acceptance.
// Assert every side the profile claims was actually exercised.
const REQUIRED = [
  "pass",
  "ERR_JWT_EXPIRED",
  "ERR_JWS_SIGNATURE_VERIFICATION_FAILED",
  "ERR_JWKS_NO_MATCHING_KEY",
  "ERR_JWT_CLAIM_VALIDATION_FAILED",
];
const missing = REQUIRED.filter((r) => !seen.has(r));
ok(missing.length === 0, "suite observed a pass and every reject reason", missing.join(", ") || "all exercised");

console.log(`\ncommitted-vector conformance: ${pass} pass, ${fail} fail`);
process.exit(fail === 0 ? 0 : 1);
