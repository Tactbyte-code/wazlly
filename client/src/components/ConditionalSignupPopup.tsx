import { useLocation } from "wouter";
import { SignupPopupHandler } from "./SignupPopupHandler";

export default function ConditionalSignupPopup() {
  const [location] = useLocation();

  if (location === "/widget-chat") {
    return null;
  }

  return <SignupPopupHandler />;
}
