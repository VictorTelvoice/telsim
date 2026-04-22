"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { ONBOARDING_STEPS } from "@/lib/onboardingSteps";

export async function updateOnboardingStep(step: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized");
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { onboardingStep: step },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update onboarding step:", error);
    return { success: false, error: error.message };
  }
}

export async function updateOnboardingCheckoutSession(sessionId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        onboardingCheckoutSessionId: sessionId,
        onboardingStep: ONBOARDING_STEPS.PROCESSING
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update checkout session:", error);
    return { success: false, error: error.message };
  }
}

export async function completeOnboarding() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new Error("Unauthorized");

    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        onboardingCompleted: true,
        onboardingStep: ONBOARDING_STEPS.COMPLETED,
        onboardingCheckoutSessionId: null,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to complete onboarding:", error);
    return { success: false, error: error.message };
  }
}
