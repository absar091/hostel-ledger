import { useTranslation } from "react-i18next";

function test() {
  const { t } = useTranslation();
  console.log(t("chat.attach_image", "Attach image"));
}
