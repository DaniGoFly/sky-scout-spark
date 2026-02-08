import { memo, useState, useCallback } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/hooks/useLocale";
import { SUPPORTED_LANGUAGES, SUPPORTED_CURRENCIES } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const LocaleSelector = memo(() => {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency } = useLocale();
  const [open, setOpen] = useState(false);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language?.split("-")[0]) ||
    SUPPORTED_LANGUAGES[0];

  const currentCurrency = SUPPORTED_CURRENCIES.find((c) => c.code === currency) || SUPPORTED_CURRENCIES[0];

  const handleLanguageChange = useCallback(
    (langCode: string) => {
      i18n.changeLanguage(langCode);
    },
    [i18n]
  );

  const handleCurrencyChange = useCallback(
    (currCode: string) => {
      setCurrency(currCode);
    },
    [setCurrency]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground px-2.5"
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">
            {currentLang.flag} {currentCurrency.code}
          </span>
          <span className="text-xs font-medium sm:hidden">
            {currentLang.flag}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("locale_selector.language")}
        </DropdownMenuLabel>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {currentLang.code === lang.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {t("locale_selector.currency")}
        </DropdownMenuLabel>
        {SUPPORTED_CURRENCIES.map((cur) => (
          <DropdownMenuItem
            key={cur.code}
            onClick={() => handleCurrencyChange(cur.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span className="w-6 text-center font-medium text-xs">{cur.symbol}</span>
              <span>{cur.code}</span>
              <span className="text-muted-foreground text-xs">({cur.name})</span>
            </span>
            {currentCurrency.code === cur.code && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
LocaleSelector.displayName = "LocaleSelector";

export default LocaleSelector;
