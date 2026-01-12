import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { motion } from "framer-motion";
import { Globe, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// Country code to name mapping for common countries
const countryNames: Record<string, string> = {
  USA: "United States",
  GBR: "United Kingdom",
  CAN: "Canada",
  AUS: "Australia",
  DEU: "Germany",
  FRA: "France",
  JPN: "Japan",
  BRA: "Brazil",
  IND: "India",
  CHN: "China",
  MEX: "Mexico",
  ESP: "Spain",
  ITA: "Italy",
  NLD: "Netherlands",
  SWE: "Sweden",
  NOR: "Norway",
  DNK: "Denmark",
  FIN: "Finland",
  POL: "Poland",
  RUS: "Russia",
  KOR: "South Korea",
  ARG: "Argentina",
  COL: "Colombia",
  CHL: "Chile",
  PER: "Peru",
  ZAF: "South Africa",
  NGA: "Nigeria",
  EGY: "Egypt",
  TUR: "Turkey",
  SAU: "Saudi Arabia",
  ARE: "UAE",
  ISR: "Israel",
  THA: "Thailand",
  VNM: "Vietnam",
  IDN: "Indonesia",
  MYS: "Malaysia",
  SGP: "Singapore",
  PHL: "Philippines",
  NZL: "New Zealand",
  IRL: "Ireland",
  PRT: "Portugal",
  BEL: "Belgium",
  AUT: "Austria",
  CHE: "Switzerland",
  CZE: "Czech Republic",
  GRC: "Greece",
  HUN: "Hungary",
  ROU: "Romania",
  UKR: "Ukraine",
};

interface GeoData {
  country: string;
  countryCode: string;
  plays: number;
  users: number;
}

export function GeoDistributionMap() {
  const { data: geoStats, isLoading } = useQuery({
    queryKey: ["admin-geo-stats"],
    queryFn: async () => {
      // Fetch events with location metadata
      const { data: events, error } = await supabase
        .from("events")
        .select("metadata, event_type")
        .not("metadata", "is", null);

      if (error) throw error;

      // Aggregate by country
      const countryStats: Record<string, { plays: number; users: Set<string> }> = {};

      events?.forEach((event) => {
        const metadata = event.metadata as Record<string, unknown> | null;
        const countryCode = metadata?.country_code as string | undefined;
        const userId = metadata?.user_id as string | undefined;

        if (countryCode) {
          if (!countryStats[countryCode]) {
            countryStats[countryCode] = { plays: 0, users: new Set() };
          }
          if (event.event_type === "play_start") {
            countryStats[countryCode].plays++;
          }
          if (userId) {
            countryStats[countryCode].users.add(userId);
          }
        }
      });

      // Convert to array
      const result: GeoData[] = Object.entries(countryStats).map(([code, stats]) => ({
        countryCode: code,
        country: countryNames[code] || code,
        plays: stats.plays,
        users: stats.users.size,
      }));

      // Sort by plays
      result.sort((a, b) => b.plays - a.plays);

      return result;
    },
  });

  const maxPlays = useMemo(() => {
    return Math.max(...(geoStats?.map((g) => g.plays) || [1]), 1);
  }, [geoStats]);

  const getCountryColor = (countryCode: string) => {
    const stat = geoStats?.find((g) => g.countryCode === countryCode);
    if (!stat || stat.plays === 0) return "hsl(var(--muted))";

    const intensity = Math.min(stat.plays / maxPlays, 1);
    // Gradient from muted to primary
    const hue = 250; // Purple-ish
    const saturation = 60 + intensity * 30;
    const lightness = 60 - intensity * 25;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const topCountries = geoStats?.slice(0, 5) || [];
  const totalPlays = geoStats?.reduce((sum, g) => sum + g.plays, 0) || 0;
  const totalCountries = geoStats?.length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="glass-panel p-6 rounded-xl"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">
            Geographic Distribution
          </h2>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{totalCountries} countries</span>
          <span>{totalPlays.toLocaleString()} plays tracked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 h-[300px] bg-muted/30 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="w-full h-full flex items-center justify-center">
              <Globe className="w-8 h-8 text-muted-foreground animate-pulse" />
            </div>
          ) : (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 120,
                center: [0, 30],
              }}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup>
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      const countryCode = geo.properties.ISO_A3;
                      const stat = geoStats?.find((g) => g.countryCode === countryCode);

                      return (
                        <TooltipProvider key={geo.rsmKey}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Geography
                                geography={geo}
                                fill={getCountryColor(countryCode)}
                                stroke="hsl(var(--border))"
                                strokeWidth={0.5}
                                style={{
                                  default: { outline: "none" },
                                  hover: {
                                    fill: "hsl(var(--primary))",
                                    outline: "none",
                                    cursor: "pointer",
                                  },
                                  pressed: { outline: "none" },
                                }}
                              />
                            </TooltipTrigger>
                            {stat && (
                              <TooltipContent>
                                <p className="font-medium">{stat.country}</p>
                                <p className="text-xs text-muted-foreground">
                                  {stat.plays.toLocaleString()} plays • {stat.users} users
                                </p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}
        </div>

        {/* Top Countries List */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Top Countries
          </h3>
          {topCountries.length > 0 ? (
            topCountries.map((country, index) => (
              <div
                key={country.countryCode}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0
                      ? "bg-yellow-500 text-yellow-950"
                      : index === 1
                      ? "bg-slate-300 text-slate-800"
                      : index === 2
                      ? "bg-amber-600 text-amber-100"
                      : "bg-muted-foreground/20 text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{country.country}</p>
                  <p className="text-xs text-muted-foreground">
                    {country.users} user{country.users !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {country.plays.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">plays</p>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No location data yet
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Location tracking starts with new plays
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
