import { AisleCategory } from './theme';

export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  group?: string;
  aisle_category: AisleCategory;
}

export interface UserPreferences {
  meal_slots: 'dinner_only' | 'lunch_dinner' | 'all';
  planning_mode: 'weekly' | 'biweekly';
  default_servings: number;
  week_start_day?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Shared planning settings stored on the household so all members see the same view */
export interface HouseholdPreferences {
  meal_slots: 'dinner_only' | 'lunch_dinner' | 'all';
  planning_mode: 'weekly' | 'biweekly';
  week_start_day?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          email: string;
          household_id: string | null;
          preferences: UserPreferences;
          created_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          email: string;
          household_id?: string | null;
          preferences?: UserPreferences;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          email?: string;
          household_id?: string | null;
          preferences?: UserPreferences;
        };
      };
      households: {
        Row: {
          id: string;
          name: string;
          preferences: HouseholdPreferences;
          invite_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          preferences?: HouseholdPreferences;
          invite_code?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          preferences?: Partial<HouseholdPreferences>;
          invite_code?: string | null;
        };
      };
      user_grocery_prefs: {
        Row: {
          user_id: string;
          ingredient_name: string;
          store_section: string;
        };
        Insert: {
          user_id: string;
          ingredient_name: string;
          store_section: string;
        };
        Update: {
          store_section?: string;
        };
      };
      household_invites: {
        Row: {
          id: string;
          household_id: string;
          invited_email: string;
          invited_by: string;
          status: 'pending' | 'accepted' | 'declined';
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          invited_email: string;
          invited_by: string;
          status?: 'pending' | 'accepted' | 'declined';
          created_at?: string;
        };
        Update: {
          status?: 'pending' | 'accepted' | 'declined';
        };
      };
      recipes: {
        Row: {
          id: string;
          user_id: string | null;
          household_id: string | null;
          is_default: boolean;
          title: string;
          description: string | null;
          source_url: string | null;
          image_url: string | null;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          total_time_minutes: number | null;
          servings: number;
          ingredients: Ingredient[];
          instructions: string[];
          categories: string[];
          tags: string[];
          rating: number | null;
          is_favorite: boolean;
          season_tags: string[];
          last_cooked_at: string | null;
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'beverage' | 'appetizer' | 'dessert' | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          household_id?: string | null;
          is_default?: boolean;
          title: string;
          description?: string | null;
          source_url?: string | null;
          image_url?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          total_time_minutes?: number | null;
          servings?: number;
          ingredients?: Ingredient[];
          instructions?: string[];
          categories?: string[];
          tags?: string[];
          rating?: number | null;
          is_favorite?: boolean;
          season_tags?: string[];
          last_cooked_at?: string | null;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'beverage' | 'appetizer' | 'dessert' | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          source_url?: string | null;
          image_url?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          total_time_minutes?: number | null;
          servings?: number;
          ingredients?: Ingredient[];
          instructions?: string[];
          categories?: string[];
          tags?: string[];
          rating?: number | null;
          is_favorite?: boolean;
          season_tags?: string[];
          last_cooked_at?: string | null;
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'beverage' | 'appetizer' | 'dessert' | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          household_id: string | null;
          name: string;
          sort_order: number;
          icon: string | null;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          name: string;
          sort_order?: number;
          icon?: string | null;
        };
        Update: {
          name?: string;
          sort_order?: number;
          icon?: string | null;
        };
      };
      tags: {
        Row: {
          id: string;
          household_id: string | null;
          name: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          household_id: string | null;
          week_start_date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          week_start_date: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          household_id?: string | null;
        };
      };
      grocery_lists: {
        Row: {
          id: string;
          household_id: string | null;
          meal_plan_id: string | null;
          week_start_date: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id?: string | null;
          meal_plan_id?: string | null;
          week_start_date: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          household_id?: string | null;
          meal_plan_id?: string | null;
        };
      };
      grocery_list_items: {
        Row: {
          id: string;
          grocery_list_id: string;
          name: string;
          amount: string | null;
          unit: string | null;
          aisle_category: string;
          is_checked: boolean;
          is_custom: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          grocery_list_id: string;
          name: string;
          amount?: string | null;
          unit?: string | null;
          aisle_category?: string;
          is_checked?: boolean;
          is_custom?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          amount?: string | null;
          unit?: string | null;
          aisle_category?: string;
          is_checked?: boolean;
          sort_order?: number;
        };
      };
      recipe_books: {
        Row: {
          id: string;
          user_id: string;
          household_id: string | null;
          name: string;
          description: string | null;
          sort_order: number;
          is_default: boolean;
          cover_color_index: number | null;
          cover_image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          household_id?: string | null;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_default?: boolean;
          cover_color_index?: number | null;
          cover_image_url?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          sort_order?: number;
          cover_color_index?: number | null;
          cover_image_url?: string | null;
        };
      };
      recipe_book_items: {
        Row: {
          id: string;
          recipe_book_id: string;
          recipe_id: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          recipe_book_id: string;
          recipe_id: string;
          added_at?: string;
        };
        Update: Record<string, never>;
      };
      meal_plan_entries: {
        Row: {
          id: string;
          meal_plan_id: string;
          date: string;
          meal_slot: 'breakfast' | 'lunch' | 'dinner';
          recipe_id: string | null;
          custom_meal_name: string | null;
          servings_override: number | null;
          side_dishes: string[];
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          date: string;
          meal_slot: 'breakfast' | 'lunch' | 'dinner';
          recipe_id?: string | null;
          custom_meal_name?: string | null;
          servings_override?: number | null;
          side_dishes?: string[];
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          date?: string;
          recipe_id?: string | null;
          custom_meal_name?: string | null;
          servings_override?: number | null;
          side_dishes?: string[];
          sort_order?: number;
        };
      };
    };
  };
};

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Household = Database['public']['Tables']['households']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
export type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];
export type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
export type MealPlanEntry = Database['public']['Tables']['meal_plan_entries']['Row'];
export type MealPlanEntryInsert = Database['public']['Tables']['meal_plan_entries']['Insert'];
export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type GroceryList = Database['public']['Tables']['grocery_lists']['Row'];
export type GroceryListInsert = Database['public']['Tables']['grocery_lists']['Insert'];
export type GroceryListItem = Database['public']['Tables']['grocery_list_items']['Row'];
export type GroceryListItemInsert = Database['public']['Tables']['grocery_list_items']['Insert'];
export type GroceryListItemUpdate = Database['public']['Tables']['grocery_list_items']['Update'];
export type UserGroceryPref = Database['public']['Tables']['user_grocery_prefs']['Row'];
export type RecipeBook = Database['public']['Tables']['recipe_books']['Row'];
export type RecipeBookItem = Database['public']['Tables']['recipe_book_items']['Row'];

export interface MarketplaceReview {
  id: string;
  listing_id: string;
  user_id: string;
  rating: number;
  created_at: string;
}

export interface MarketplaceRatingSummary {
  average: number;
  count: number;
  userRating: number | null;
}

export interface MarketplaceListing {
  id: string;
  book_id: string;
  seller_user_id: string;
  title: string;
  description: string;
  price_cents: number;
  featured_recipe_id: string | null;
  cover_color_index: number;
  cover_image_url: string | null;
  status: 'draft' | 'active' | 'archived';
  published_at: string | null;
  created_at: string;
}

export interface MarketplaceListingInsert {
  book_id: string;
  seller_user_id: string;
  title: string;
  description?: string;
  price_cents?: number;
  featured_recipe_id?: string | null;
  cover_color_index?: number;
  cover_image_url?: string | null;
  status?: 'draft' | 'active' | 'archived';
  published_at?: string | null;
}

export interface MarketplacePurchase {
  id: string;
  listing_id: string;
  buyer_user_id: string;
  amount_paid_cents: number;
  stripe_payment_intent_id: string | null;
  status: 'pending' | 'completed';
  purchased_at: string;
}

/** Listing with denormalized display data used in browse + detail screens. */
export interface MarketplaceListingDetail extends MarketplaceListing {
  seller_name: string;
  recipe_count: number;
  recipe_titles: string[];        // all recipe titles in the book
  featured_recipe: Recipe | null; // full recipe content for the sample
  avg_rating: number | null;
  rating_count: number;
}
