-- Seed recipes sourced from Neighbor Impact Food Bank's printed recipe cards
-- (https://www.neighborimpact.org/get-help/get-food/recipes/). user_id is left
-- NULL (recipes.user_id is nullable, ON DELETE SET NULL) since these are
-- system-provided recipes, not submitted by an app user.
--
-- Each recipe uses a data-modifying CTE so the INSERT ... WHERE NOT EXISTS
-- guard makes the whole block safely re-runnable: if the recipe already
-- exists (matched by title), new_recipe returns no rows and the tag insert
-- that follows inserts nothing either.

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Vegetarian Chili',
    'A hearty vegetable and bean chili from Neighbor Impact Food Bank, thickened with mashed beans for a rich, chili-like texture.',
    'https://cookieandkate.com/vegetarian-chili-recipe/',
    15, 40, 6, 'beginner',
    '[
      {"name": "extra-virgin olive oil", "amount": "2", "unit": "tablespoons"},
      {"name": "onion, chopped", "amount": "1", "unit": "medium"},
      {"name": "red bell pepper, chopped", "amount": "1", "unit": "large"},
      {"name": "carrots, chopped", "amount": "2", "unit": "medium"},
      {"name": "celery, chopped", "amount": "2", "unit": "ribs"},
      {"name": "salt, divided", "amount": "1/2", "unit": "teaspoon"},
      {"name": "garlic, pressed or minced", "amount": "4", "unit": "cloves"},
      {"name": "chili powder", "amount": "2", "unit": "tablespoons"},
      {"name": "ground cumin", "amount": "2", "unit": "teaspoons"},
      {"name": "smoked paprika", "amount": "1 1/2", "unit": "teaspoons"},
      {"name": "dried oregano", "amount": "1", "unit": "teaspoon"},
      {"name": "diced tomatoes, with their juices", "amount": "28", "unit": "ounce can"},
      {"name": "kidney beans, rinsed and drained", "amount": "2", "unit": "15 oz cans"},
      {"name": "pinto or black beans, rinsed and drained", "amount": "1", "unit": "15 oz can"},
      {"name": "vegetable broth or water", "amount": "2", "unit": "cups"},
      {"name": "bay leaf", "amount": "1", "unit": ""},
      {"name": "sherry vinegar, red wine vinegar, or lime juice, to taste", "amount": "1-2", "unit": "teaspoons"},
      {"name": "fresh cilantro, chopped, plus more for garnishing", "amount": "2", "unit": "tablespoons"},
      {"name": "sliced avocado", "amount": "", "unit": "", "group": "Optional Toppings"},
      {"name": "shredded cheddar cheese", "amount": "", "unit": "", "group": "Optional Toppings"},
      {"name": "sour cream", "amount": "", "unit": "", "group": "Optional Toppings"},
      {"name": "tortilla chips", "amount": "", "unit": "", "group": "Optional Toppings"}
    ]'::jsonb,
    ARRAY[
      'In a large heavy-bottomed pot over medium heat, warm the olive oil until shimmering. Add the chopped onion, bell pepper, carrot, celery, and 1/4 teaspoon of the salt. Cook, stirring occasionally, until the vegetables are tender and the onion is translucent, about 7 to 10 minutes.',
      'Add the garlic, chili powder, cumin, smoked paprika, and oregano. Cook until fragrant while stirring constantly, about 1 minute.',
      'Add the diced tomatoes and their juices, the drained beans, vegetable broth, and bay leaf. Stir to combine and bring to a simmer. Continue cooking, stirring occasionally, for 30 minutes.',
      'Remove from heat and discard the bay leaf. For the best texture, blend briefly with an immersion blender or mash with a potato masher until thicker and chili-like.',
      'Stir in the chopped cilantro and vinegar to taste. Add salt to taste. Serve with your choice of toppings (avocado, cheddar, sour cream, tortilla chips).'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Vegetarian Chili')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Canned diced tomatoes', 'Canned kidney beans', 'Canned pinto beans', 'Canned black beans', 'Onions', 'Carrots', 'Cooking oil');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Red Lentil & Pumpkin Soup',
    'A simple, warming curried soup from Neighbor Impact Food Bank made with pantry staples: red lentils and canned pumpkin.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    10, 25, 6, 'beginner',
    '[
      {"name": "yellow onion, diced", "amount": "1", "unit": ""},
      {"name": "garlic, minced", "amount": "2", "unit": "cloves"},
      {"name": "fresh ginger, grated", "amount": "1", "unit": "teaspoon"},
      {"name": "olive oil", "amount": "1", "unit": "tablespoon"},
      {"name": "curry powder", "amount": "1", "unit": "tablespoon"},
      {"name": "pumpkin puree", "amount": "15", "unit": "ounce can"},
      {"name": "dry red lentils", "amount": "1", "unit": "cup"},
      {"name": "vegetable broth", "amount": "6", "unit": "cups"},
      {"name": "salt, to taste", "amount": "1/2", "unit": "teaspoon"}
    ]'::jsonb,
    ARRAY[
      'Dice the onion, mince the garlic, and grate the ginger. Add to a large pot with the olive oil and sauté over medium heat until the onions are soft, about 5 minutes.',
      'Add the curry powder and continue to sauté for about a minute more.',
      'Add the pumpkin puree, lentils, and vegetable broth. Stir to combine.',
      'Cover and bring to a boil over medium-high heat. Reduce heat to medium-low and simmer, stirring occasionally, for 20 minutes. Taste and add salt as needed.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Red Lentil & Pumpkin Soup')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Onions', 'Canned pumpkin', 'Dry lentils');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Pumpkin Mac & Cheese',
    'A creamy baked macaroni and cheese from Neighbor Impact Food Bank with canned pumpkin stirred into the sauce.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    15, 30, 8, 'intermediate',
    '[
      {"name": "unsalted butter", "amount": "6", "unit": "tablespoons (3/4 stick)"},
      {"name": "all-purpose flour", "amount": "1/4-1/2", "unit": "cup"},
      {"name": "chicken stock (or vegetable stock)", "amount": "1", "unit": "cup"},
      {"name": "garlic cloves, minced", "amount": "4-5", "unit": "large"},
      {"name": "yellow onion, grated", "amount": "1/2", "unit": "medium"},
      {"name": "sharp cheddar cheese, grated", "amount": "8", "unit": "ounces"},
      {"name": "Parmesan cheese, grated", "amount": "1/2", "unit": "cup"},
      {"name": "Dijon mustard", "amount": "1", "unit": "tablespoon"},
      {"name": "pure pumpkin puree (not pie filling)", "amount": "15", "unit": "ounce can"},
      {"name": "whole milk", "amount": "1 1/4", "unit": "cups"},
      {"name": "short pasta", "amount": "1", "unit": "pound"},
      {"name": "salt and black pepper, to taste", "amount": "", "unit": ""}
    ]'::jsonb,
    ARRAY[
      'Preheat oven to 375°F. Grease a 9x13-inch baking dish.',
      'Bring a large pot of salted water to a boil. Cook pasta 7 minutes, then drain and set aside.',
      'In a large saucepan, melt the butter, add the grated onion and minced garlic, and sauté 2-3 minutes until softened. Whisk in the flour and cook 1-2 minutes to form a roux.',
      'Slowly whisk in the chicken stock, then the milk. Cook, whisking constantly, until thickened, about 5-7 minutes. Stir in the pumpkin puree, Dijon mustard, and a pinch of salt and pepper. Simmer 2-3 minutes until smooth.',
      'Remove from heat and stir in the grated cheddar and Parmesan until melted and creamy. Thin with a splash of milk or stock if too thick.',
      'Fold in the cooked pasta until evenly coated. Transfer to the baking dish and top with extra cheese, breadcrumbs, or bacon if desired.',
      'Bake 20-25 minutes until bubbly and golden. Broil 1-2 minutes for a crisp topping if needed. Let rest 5-10 minutes before serving.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Pumpkin Mac & Cheese')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Cheese', 'Canned pumpkin', 'Macaroni', 'Shelf-stable milk');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'The Easiest Roasted Rutabaga',
    'A simple three-ingredient roasted side dish from Neighbor Impact Food Bank.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    10, 40, 4, 'beginner',
    '[
      {"name": "olive oil", "amount": "2", "unit": "tablespoons"},
      {"name": "salt and pepper, to taste", "amount": "", "unit": ""},
      {"name": "rutabaga", "amount": "1", "unit": ""}
    ]'::jsonb,
    ARRAY[
      'Preheat oven to 425°F.',
      'Peel and chop the rutabaga into one-inch cubes.',
      'Toss with the oil, salt, and pepper.',
      'Spread on a baking sheet and bake for 40 minutes, flipping halfway through.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'The Easiest Roasted Rutabaga')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Cooking oil');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Parmesan Polenta',
    'A creamy stovetop polenta from Neighbor Impact Food Bank, finished with butter and Parmesan.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    5, 20, 4, 'beginner',
    '[
      {"name": "olive oil", "amount": "2", "unit": "tablespoons"},
      {"name": "minced garlic", "amount": "1", "unit": "teaspoon"},
      {"name": "corn grits", "amount": "1", "unit": "cup"},
      {"name": "chicken broth", "amount": "3", "unit": "cups"},
      {"name": "grated Parmesan", "amount": "1/4", "unit": "cup"},
      {"name": "butter", "amount": "3", "unit": "tablespoons"},
      {"name": "salt and pepper, each", "amount": "1/4", "unit": "teaspoon"}
    ]'::jsonb,
    ARRAY[
      'In a large saucepan, heat the olive oil over medium heat.',
      'Add the garlic and sauté 1-2 minutes.',
      'Turn heat to high, add the chicken broth, and bring to a boil.',
      'Gradually add the grits while continuously mixing.',
      'Reduce heat to low and stir frequently for 15 minutes.',
      'Once creamy, remove from heat and stir in the butter, salt, pepper, and Parmesan until thoroughly combined. Serve warm.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Parmesan Polenta')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Chicken broth', 'Cheese', 'Cooking oil');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Chickpea Hummus',
    'A classic five-minute hummus from Neighbor Impact Food Bank, made with canned chickpeas.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    10, 0, 6, 'beginner',
    '[
      {"name": "chickpeas, drained (or 1 1/2 cups cooked/thawed chickpeas)", "amount": "15", "unit": "ounce can"},
      {"name": "fresh lemon juice (about 1 large lemon)", "amount": "1/4", "unit": "cup"},
      {"name": "well-stirred tahini, non-fat yogurt, or 1/2 tbsp peanut butter", "amount": "2", "unit": "tablespoons"},
      {"name": "garlic clove, minced", "amount": "1", "unit": "small"},
      {"name": "extra-virgin olive oil", "amount": "2", "unit": "tablespoons"},
      {"name": "ground cumin", "amount": "1/2", "unit": "teaspoon"},
      {"name": "salt, to taste", "amount": "", "unit": ""},
      {"name": "cold water", "amount": "2-3", "unit": "tablespoons"}
    ]'::jsonb,
    ARRAY[
      'Whip the lemon juice and tahini together in a bowl or food processor. Add the olive oil and spices and mix well.',
      'Add the chickpeas and water, blending until the desired consistency is reached.',
      'Taste and adjust with salt, lemon, or more water as needed.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Chickpea Hummus')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Canned chickpeas', 'Peanut butter', 'Cooking oil');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Pumpkin Coffee Cake',
    'A spiced pumpkin snack cake from Neighbor Impact Food Bank topped with a buttery cinnamon crumble.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    15, 35, 9, 'intermediate',
    '[
      {"name": "all-purpose flour", "amount": "2", "unit": "cups", "group": "Cake"},
      {"name": "baking soda", "amount": "1", "unit": "teaspoon", "group": "Cake"},
      {"name": "baking powder", "amount": "1/2", "unit": "teaspoon", "group": "Cake"},
      {"name": "salt", "amount": "1/2", "unit": "teaspoon", "group": "Cake"},
      {"name": "pumpkin pie spice", "amount": "2 1/2", "unit": "teaspoons", "group": "Cake"},
      {"name": "pumpkin puree", "amount": "1", "unit": "cup", "group": "Cake"},
      {"name": "brown sugar, packed", "amount": "1/2", "unit": "cup", "group": "Cake"},
      {"name": "canola or vegetable oil", "amount": "1/2", "unit": "cup", "group": "Cake"},
      {"name": "pure maple syrup", "amount": "1/4", "unit": "cup", "group": "Cake"},
      {"name": "milk", "amount": "1/4", "unit": "cup", "group": "Cake"},
      {"name": "all-purpose flour", "amount": "1/2", "unit": "cup", "group": "Crumb Topping"},
      {"name": "brown sugar, packed", "amount": "1/2", "unit": "cup", "group": "Crumb Topping"},
      {"name": "ground cinnamon", "amount": "1 1/2", "unit": "teaspoons", "group": "Crumb Topping"},
      {"name": "unsalted butter, cold", "amount": "1/4", "unit": "cup", "group": "Crumb Topping"}
    ]'::jsonb,
    ARRAY[
      'Preheat oven to 350°F. Grease a 9-inch square pan.',
      'Make the crumb topping first: mix all crumb topping ingredients together in a small bowl, cutting in the cold butter until clumpy.',
      'In a large bowl, mix the flour, baking soda, baking powder, salt, and pumpkin pie spice. In a separate medium bowl, mix the brown sugar, pumpkin, oil, milk, and maple syrup. Combine the wet and dry ingredients.',
      'Spread the batter into the pan and cover with the crumb topping, gently pressing it flat.',
      'Bake for 30-35 minutes, or until a toothpick comes out clean.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Pumpkin Coffee Cake')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Canned pumpkin', 'All-purpose flour', 'Shelf-stable milk');

WITH new_recipe AS (
  INSERT INTO public.recipes (title, description, source_url, prep_time_minutes, cook_time_minutes, servings, skill_level, ingredients, instructions)
  SELECT
    'Pumpkin Chili',
    'A ground beef and bean chili from Neighbor Impact Food Bank with canned pumpkin stirred in for body and a touch of sweetness.',
    'https://www.neighborimpact.org/get-help/get-food/recipes/',
    15, 35, 6, 'beginner',
    '[
      {"name": "pumpkin puree", "amount": "15", "unit": "ounce can", "group": "Chili"},
      {"name": "diced tomatoes", "amount": "1", "unit": "can", "group": "Chili"},
      {"name": "black beans", "amount": "1", "unit": "can", "group": "Chili"},
      {"name": "kidney beans", "amount": "1", "unit": "can", "group": "Chili"},
      {"name": "ground beef", "amount": "1", "unit": "pound", "group": "Chili"},
      {"name": "tomato paste", "amount": "1/2", "unit": "6 oz can", "group": "Chili"},
      {"name": "water", "amount": "2", "unit": "cups", "group": "Chili"},
      {"name": "garlic, minced", "amount": "2", "unit": "cloves", "group": "Chili"},
      {"name": "yellow onion, diced", "amount": "1", "unit": "", "group": "Chili"},
      {"name": "olive oil", "amount": "2", "unit": "tablespoons", "group": "Chili"},
      {"name": "chili powder", "amount": "1", "unit": "tablespoon", "group": "Chili Seasoning"},
      {"name": "smoked paprika", "amount": "1/2", "unit": "teaspoon", "group": "Chili Seasoning"},
      {"name": "ground cumin", "amount": "1", "unit": "teaspoon", "group": "Chili Seasoning"},
      {"name": "garlic powder", "amount": "1/4", "unit": "teaspoon", "group": "Chili Seasoning"},
      {"name": "onion powder", "amount": "1/2", "unit": "teaspoon", "group": "Chili Seasoning"},
      {"name": "cracked black pepper", "amount": "1/4", "unit": "teaspoon", "group": "Chili Seasoning"},
      {"name": "salt", "amount": "1", "unit": "teaspoon", "group": "Chili Seasoning"}
    ]'::jsonb,
    ARRAY[
      'Add the minced garlic, diced onion, and olive oil to a large pot. Sauté over medium heat until the onions are tender, about 5 minutes.',
      'Add the ground beef and cook until browned.',
      'Add the drained beans, diced tomatoes, pumpkin puree, tomato paste, water, and chili seasoning. Stir to combine.',
      'Cover and simmer for 30 minutes, stirring occasionally.',
      'Serve hot with your favorite chili toppings.'
    ]
  WHERE NOT EXISTS (SELECT 1 FROM public.recipes WHERE title = 'Pumpkin Chili')
  RETURNING id
)
INSERT INTO public.recipe_food_bank_items (recipe_id, food_bank_item_id)
SELECT new_recipe.id, food_bank_items.id
FROM new_recipe, public.food_bank_items
WHERE food_bank_items.name IN ('Canned pumpkin', 'Canned diced tomatoes', 'Canned black beans', 'Canned kidney beans', 'Ground beef', 'Onions');
