import { useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Calendar, Search, Loader2, X, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format, parse } from "date-fns";
import AirportAutocomplete from "./AirportAutocomplete";
import MultiOriginInput, { type AirportSelection } from "./MultiOriginInput";
import TravelersPicker, { TravelersData } from "./TravelersPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { getDefaultDates } from "@/lib/dateUtils";
import { useLocale } from "@/hooks/useLocale";
import { trackFlightSearch } from "@/lib/metaPixel";

interface MobileSearchEditorProps {
  isSearching?: boolean;
  onSearch: (params: URLSearchParams) => void;
}

const MobileSearchEditor = ({ isSearching = false, onSearch }: MobileSearchEditorProps) => {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { currency, marketCode } = useLocale();
  const [open, setOpen] = useState(false);

  const defaultDates = getDefaultDates();

  // Parse current search state from URL
  const fromParam = searchParams.get("from") || "";
  const fromCodes = fromParam.split(",").map(s => s.trim()).filter(Boolean);
  const toCode = searchParams.get("to")?.split(",")[0] || "";
  const departStr = searchParams.get("depart") || "";
  const returnStr = searchParams.get("return") || "";
  const tripType = (searchParams.get("trip") as "roundtrip" | "oneway") || "roundtrip";

  // Local editing state — initialized when sheet opens
  const [editTripType, setEditTripType] = useState<"roundtrip" | "oneway">(tripType);
  const [editOrigins, setEditOrigins] = useState<AirportSelection[]>(
    fromCodes.map(code => ({ code, display: code }))
  );
  const [editTo, setEditTo] = useState<AirportSelection | null>(
    toCode ? { code: toCode, display: toCode } : null
  );
  const [editDepartDate, setEditDepartDate] = useState<Date>(() =>
    departStr ? parse(departStr, "yyyy-MM-dd", new Date()) : defaultDates.depart
  );
  const [editReturnDate, setEditReturnDate] = useState<Date>(() =>
    returnStr ? parse(returnStr, "yyyy-MM-dd", new Date()) : defaultDates.return
  );
  const [editTravelers, setEditTravelers] = useState<TravelersData>(() => {
    const adults = Number(searchParams.get("adults")) || 1;
    const children = Number(searchParams.get("children")) || 0;
    const infants = Number(searchParams.get("infants")) || 0;
    const cabinRaw = searchParams.get("class") || "economy";
    const cabinClass = (["economy", "premium_economy", "business", "first"].includes(cabinRaw) ? cabinRaw : "economy") as TravelersData["cabinClass"];
    return { adults, children, infantsSeat: infants, infantsLap: 0, cabinClass };
  });

  const [departPopoverOpen, setDepartPopoverOpen] = useState(false);
  const [returnPopoverOpen, setReturnPopoverOpen] = useState(false);

  // Re-sync state when sheet opens
  const handleOpen = useCallback(() => {
    const fp = searchParams.get("from") || "";
    const fc = fp.split(",").map(s => s.trim()).filter(Boolean);
    const tc = searchParams.get("to")?.split(",")[0] || "";
    const ds = searchParams.get("depart") || "";
    const rs = searchParams.get("return") || "";
    const tt = (searchParams.get("trip") as "roundtrip" | "oneway") || "roundtrip";

    setEditTripType(tt);
    setEditOrigins(fc.map(code => ({ code, display: code })));
    setEditTo(tc ? { code: tc, display: tc } : null);
    setEditDepartDate(ds ? parse(ds, "yyyy-MM-dd", new Date()) : defaultDates.depart);
    setEditReturnDate(rs ? parse(rs, "yyyy-MM-dd", new Date()) : defaultDates.return);

    const adults = Number(searchParams.get("adults")) || 1;
    const children = Number(searchParams.get("children")) || 0;
    const infants = Number(searchParams.get("infants")) || 0;
    const cabinRaw = searchParams.get("class") || "economy";
    const cabinClass = (["economy", "premium_economy", "business", "first"].includes(cabinRaw) ? cabinRaw : "economy") as TravelersData["cabinClass"];
    setEditTravelers({ adults, children, infantsSeat: infants, infantsLap: 0, cabinClass });

    setOpen(true);
  }, [searchParams, defaultDates]);

  const handleSearch = useCallback(() => {
    if (editOrigins.length === 0 || !editTo) return;
    const totalInfants = editTravelers.infantsSeat + editTravelers.infantsLap;
    const params = new URLSearchParams({
      from: editOrigins.map(o => o.code).join(","),
      to: editTo.code,
      depart: format(editDepartDate, "yyyy-MM-dd"),
      adults: editTravelers.adults.toString(),
      children: editTravelers.children.toString(),
      infants: totalInfants.toString(),
      class: editTravelers.cabinClass,
      trip: editTripType,
      currency: currency.toUpperCase(),
      market: marketCode.toUpperCase(),
      ...(editTripType === "roundtrip" ? { return: format(editReturnDate, "yyyy-MM-dd") } : {}),
    });
    setOpen(false);
    trackFlightSearch(params);
    onSearch(params);
  }, [editOrigins, editTo, editDepartDate, editReturnDate, editTravelers, editTripType, currency, marketCode, onSearch]);

  // Summary bar (tappable)
  const summaryFrom = fromCodes.join(", ") || "—";
  const summaryTo = toCode || "—";
  const summaryDate = departStr ? format(parse(departStr, "yyyy-MM-dd", new Date()), "MMM d") : "—";

  return (
    <>
      {/* Tappable summary bar — mobile only */}
      <button
        onClick={handleOpen}
        className="md:hidden w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/60 border border-border/50 text-left active:bg-secondary/80 transition-colors"
      >
        <Pencil className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="flex-1 text-xs text-foreground truncate">
          {summaryFrom} → {summaryTo} · {summaryDate}
        </span>
        <span className="text-[10px] text-primary font-medium shrink-0">{t("search.edit", "Edit")}</span>
      </button>

      {/* Bottom sheet editor */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto px-4 pb-8">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base">{t("search.edit_search", "Edit Search")}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Trip Type */}
            <div className="flex gap-1">
              <button
                onClick={() => setEditTripType("roundtrip")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  editTripType === "roundtrip"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {t("search.roundtrip")}
              </button>
              <button
                onClick={() => setEditTripType("oneway")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  editTripType === "oneway"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {t("search.oneway")}
              </button>
            </div>

            {/* From */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("search.from")}</label>
              <MultiOriginInput values={editOrigins} onChange={setEditOrigins} placeholder={t("search.from")} compact />
            </div>

            {/* To */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("search.to")}</label>
              <AirportAutocomplete value={editTo} onChange={setEditTo} placeholder={t("search.to")} icon="to" compact />
            </div>

            {/* Dates */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("search.depart", "Depart")}</label>
                <Popover open={departPopoverOpen} onOpenChange={setDepartPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm">
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      {format(editDepartDate, "MMM d")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card z-[1100]" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={editDepartDate}
                      onSelect={(date) => {
                        if (date) {
                          setEditDepartDate(date);
                          if (date > editReturnDate) setEditReturnDate(new Date(date.getTime() + 7 * 86400000));
                          setDepartPopoverOpen(false);
                        }
                      }}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {editTripType === "roundtrip" && (
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("search.return", "Return")}</label>
                  <Popover open={returnPopoverOpen} onOpenChange={setReturnPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full h-10 justify-start text-left font-normal bg-secondary/50 border-transparent rounded-lg text-sm">
                        <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                        {format(editReturnDate, "MMM d")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card z-[1100]" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editReturnDate}
                        onSelect={(date) => {
                          if (date) { setEditReturnDate(date); setReturnPopoverOpen(false); }
                        }}
                        disabled={(date) => date < editDepartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            {/* Travelers */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("search.travelers", "Travelers")}</label>
              <TravelersPicker value={editTravelers} onChange={setEditTravelers} compact />
            </div>

            {/* Search button */}
            <Button
              onClick={handleSearch}
              disabled={isSearching || editOrigins.length === 0 || !editTo}
              className="w-full h-12 gap-2 text-base font-semibold"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {isSearching ? t("search.searching") : t("search.search")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MobileSearchEditor;
