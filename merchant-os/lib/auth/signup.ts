// Public sign-up is closed during the trial (Supabase: disable_signup = true).
// Set NEXT_PUBLIC_SIGNUP_OPEN=true only after re-enabling sign-up in Supabase.
export const signupOpen = process.env.NEXT_PUBLIC_SIGNUP_OPEN === "true";
