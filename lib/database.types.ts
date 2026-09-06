export interface Ingredient {
  name: string;
  amount: string;
  unit: string;
  /** Optional recipe-section sub-heading, e.g. "For the sauce". Not a grocery-aisle concept. */
  group?: string;
}

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          email: string;
          display_name: string | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          display_name?: string | null;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
        };
        Relationships: [];
      };
      food_bank_items: {
        Row: {
          id: string;
          name: string;
          category: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: string;
          image_url?: string | null;
        };
        Relationships: [];
      };
      user_pantry: {
        Row: {
          id: string;
          user_id: string;
          food_bank_item_id: string;
          received_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          food_bank_item_id: string;
          received_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          description: string | null;
          source_url: string | null;
          image_url: string | null;
          prep_time_minutes: number | null;
          cook_time_minutes: number | null;
          servings: number;
          skill_level: SkillLevel | null;
          ingredients: Ingredient[];
          instructions: string[];
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          source_url?: string | null;
          image_url?: string | null;
          prep_time_minutes?: number | null;
          cook_time_minutes?: number | null;
          servings?: number;
          skill_level?: SkillLevel | null;
          ingredients?: Ingredient[];
          instructions?: string[];
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
          servings?: number;
          skill_level?: SkillLevel | null;
          ingredients?: Ingredient[];
          instructions?: string[];
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      recipe_food_bank_items: {
        Row: {
          recipe_id: string;
          food_bank_item_id: string;
        };
        Insert: {
          recipe_id: string;
          food_bank_item_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      recipe_ratings: {
        Row: {
          id: string;
          recipe_id: string;
          user_id: string;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          user_id: string;
          rating: number;
          created_at?: string;
        };
        Update: {
          rating?: number;
        };
        Relationships: [];
      };
      recipe_import_log: {
        Row: {
          id: string;
          user_id: string;
          url_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url_hash?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      recipe_import_cache: {
        Row: {
          url_hash: string;
          result: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          url_hash: string;
          result: Record<string, unknown>;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type FoodBankItem = Database['public']['Tables']['food_bank_items']['Row'];
export type UserPantryItem = Database['public']['Tables']['user_pantry']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
export type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
export type RecipeFoodBankItem = Database['public']['Tables']['recipe_food_bank_items']['Row'];
export type RecipeRating = Database['public']['Tables']['recipe_ratings']['Row'];
