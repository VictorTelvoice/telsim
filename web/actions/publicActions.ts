"use server";

export async function submitContactForm(data: { name: string; company: string; email: string; message: string; language: string }) {
  try {
    const { name, company, email, message } = data;
    
    if (!name || !email || !message) {
      throw new Error("Missing required fields");
    }

    // MOCK: in production, save to db or discord webhook
    console.log(`Contact message received from ${name} (${email}) - ${company}: ${message}`);

    return { success: true, message: "Thank you for contacting us. We'll be in touch." };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit form" };
  }
}
