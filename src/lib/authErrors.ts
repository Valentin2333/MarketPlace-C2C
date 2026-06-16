export function friendlyAuthError(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("email") && msg.includes("invalid")) {
    return "This email address doesn't look valid. Check the part after the @ (the domain) and make sure it's a real address you can receive mail at.";
  }

  if (
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (msg.includes("invalid login credentials")) {
    return "Incorrect email or password. Please try again.";
  }

  if (msg.includes("password")) {
    return "Your password doesn't meet the requirements. Use at least 8 characters.";
  }

  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  if (msg.includes("confirm") && msg.includes("email")) {
    return "Please confirm your email first. Check your inbox for the confirmation link.";
  }

  return message;
}
