import type { Tables, Enums } from "./database.types";

export type Profile = Tables<"profiles">;
export type Group = Tables<"groups">;
export type Beer = Tables<"beers">;
export type Rating = Tables<"ratings">;
export type WishlistEntry = Tables<"wishlist">;
export type CatalogBeer = Tables<"beer_catalog">;
export type Serving = Enums<"serving_type">;
export type Role = "admin" | "member";

export type Member = {
  user_id: string;
  role: Role;
  joined_at: string;
  profile: Profile;
};

/** Profil-Ersatz für Personen, die die Gruppe verlassen haben. */
export function unknownProfile(id: string): Profile {
  return {
    id,
    display_name: "Ehemalig",
    emoji: "👻",
    color: "#A8A29E",
    hide_grades: false,
    onboarded: true,
    created_at: "",
  };
}
