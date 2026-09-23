"use client";

import type { HospitalityProfile } from "@/lib/ai/hospitality-brain";

const PROFILE_KEY = "pisao-concierge-hospitality-v1";

const EMPTY_PROFILE: HospitalityProfile = {
  version: 1,
  interactionCount: 0,
  preferredFoodSignals: [],
  preferredDrinkSignals: [],
};

export function loadHospitalityProfile(): HospitalityProfile {
  if (typeof window === "undefined") return EMPTY_PROFILE;

  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;

    const parsed = JSON.parse(raw) as Partial<HospitalityProfile>;
    return {
      version: 1,
      interactionCount:
        typeof parsed.interactionCount === "number" &&
        Number.isInteger(parsed.interactionCount)
          ? Math.min(Math.max(parsed.interactionCount, 0), 500)
          : 0,
      conversationStyle: parsed.conversationStyle,
      preferredFoodSignals: Array.isArray(parsed.preferredFoodSignals)
        ? parsed.preferredFoodSignals.slice(0, 6)
        : [],
      preferredDrinkSignals: Array.isArray(parsed.preferredDrinkSignals)
        ? parsed.preferredDrinkSignals.slice(0, 6)
        : [],
      lastIntent: parsed.lastIntent,
      lastGuestState: parsed.lastGuestState,
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function saveHospitalityProfile(profile: HospitalityProfile) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        version: 1,
        interactionCount: Math.min(Math.max(profile.interactionCount, 0), 500),
        conversationStyle: profile.conversationStyle,
        preferredFoodSignals: profile.preferredFoodSignals.slice(0, 6),
        preferredDrinkSignals: profile.preferredDrinkSignals.slice(0, 6),
        lastIntent: profile.lastIntent,
        lastGuestState: profile.lastGuestState,
      } satisfies HospitalityProfile),
    );
  } catch {
    // Memory should never interrupt the guest journey.
  }
}
