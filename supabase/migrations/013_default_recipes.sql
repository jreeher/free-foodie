-- 013_default_recipes.sql
-- Adds a set of built-in "Surprise Me" recipes that are globally visible to
-- all authenticated users but hidden from the main recipe list. Users can
-- claim them into their own collection via the Discover screen.

-- ============================================================
-- 1. Make user_id nullable so default recipes have no owner
-- ============================================================
ALTER TABLE public.recipes ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================
-- 2. Add is_default flag
-- ============================================================
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- 3. Allow all authenticated users to read default recipes
--    (default recipes have no user_id so existing policies won't match)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view default recipes" ON public.recipes;
CREATE POLICY "Anyone can view default recipes"
  ON public.recipes FOR SELECT
  USING (is_default = true);

-- ============================================================
-- 4. Seed 10 default recipes
-- ============================================================
INSERT INTO public.recipes (
  user_id, household_id, title, description, categories, tags,
  prep_time_minutes, cook_time_minutes, total_time_minutes, servings,
  ingredients, instructions, is_default, is_favorite, season_tags
) VALUES

-- 1. Honey Garlic Chicken
(NULL, NULL,
 'Honey Garlic Chicken',
 'Chicken breasts seared golden then simmered in a sticky, sweet-savory honey garlic sauce — on the table in 12 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 4, 8, 12, 4,
 '[
   {"name":"boneless skinless chicken breasts","amount":"1","unit":"lb","aisle_category":"Meat & Seafood"},
   {"name":"all-purpose flour","amount":"0.25","unit":"cup","aisle_category":"Baking"},
   {"name":"unsalted butter","amount":"3.5","unit":"tbsp","aisle_category":"Dairy & Eggs"},
   {"name":"garlic cloves, minced","amount":"2","unit":"cloves","aisle_category":"Produce"},
   {"name":"apple cider vinegar","amount":"1.5","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"soy sauce","amount":"1","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"honey","amount":"0.33","unit":"cup","aisle_category":"Condiments & Sauces"},
   {"name":"salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"black pepper","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"}
 ]'::jsonb,
 ARRAY[
   'Slice each chicken breast horizontally into 2 thin steaks. Season both sides with salt and pepper.',
   'Dredge chicken in flour in a shallow dish and shake off the excess.',
   'Melt all but 1 tsp of the butter in a large skillet over high heat.',
   'Cook chicken 2–3 minutes until golden, flip, and cook the other side 1 minute.',
   'Reduce heat to medium-high. Push chicken to the side and add remaining butter and garlic; stir briefly until fragrant.',
   'Add vinegar, soy sauce, and honey; stir to combine. Simmer 1 minute until slightly thickened.',
   'Coat chicken in the sauce, adding a splash of water if needed to loosen. Remove from heat and serve immediately.'
 ],
 true, false, ARRAY[]::text[]),

-- 2. One-Pot Chicken Alfredo Pasta
(NULL, NULL,
 'One-Pot Chicken Alfredo Pasta',
 'Fettuccine, chicken, and a silky parmesan cream sauce all cook together in a single skillet for an incredibly creamy pasta with minimal cleanup.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 2, 13, 15, 3,
 '[
   {"name":"chicken breast","amount":"7","unit":"oz","aisle_category":"Meat & Seafood"},
   {"name":"fettuccine","amount":"8","unit":"oz","aisle_category":"Grains & Pasta"},
   {"name":"whole milk","amount":"2","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"chicken broth","amount":"1.5","unit":"cup","aisle_category":"Canned & Jarred"},
   {"name":"garlic cloves, minced","amount":"1","unit":"clove","aisle_category":"Produce"},
   {"name":"heavy cream","amount":"0.5","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"parmesan cheese, freshly grated","amount":"0.75","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"olive oil","amount":"1","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"black pepper","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"fresh parsley, chopped","amount":"2","unit":"tbsp","aisle_category":"Produce"}
 ]'::jsonb,
 ARRAY[
   'Season both sides of chicken breast with salt and pepper.',
   'Heat oil in a large skillet over medium-high heat. Cook chicken 2 minutes per side until golden and cooked through. Rest 5 minutes, then slice.',
   'To the same skillet, add milk, chicken broth, and garlic. Bring to a simmer then add the fettuccine.',
   'Stir pasta every 30 seconds for the first 3 minutes until it softens, then every couple of minutes on medium heat.',
   'After 9–10 minutes, the pasta should be nearly cooked with some liquid remaining. Add cream and parmesan; stir well.',
   'Simmer 2 more minutes, stirring occasionally, until the sauce thickens and pasta is fully cooked.',
   'Top with sliced chicken and parsley; serve immediately.'
 ],
 true, false, ARRAY[]::text[]),

-- 3. Lemon Garlic Shrimp Pasta
(NULL, NULL,
 'Lemon Garlic Shrimp Pasta',
 'Bright, garlicky shrimp tossed with spaghetti, fresh lemon, and a hint of heat — a restaurant-quality dinner in just 20 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 10, 10, 20, 4,
 '[
   {"name":"dried spaghetti","amount":"12","unit":"oz","aisle_category":"Grains & Pasta"},
   {"name":"olive oil","amount":"3","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"unsalted butter","amount":"2","unit":"tbsp","aisle_category":"Dairy & Eggs"},
   {"name":"garlic cloves, minced","amount":"5","unit":"cloves","aisle_category":"Produce"},
   {"name":"crushed red pepper flakes","amount":"0.25","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"medium shrimp, peeled and deveined","amount":"1","unit":"lb","aisle_category":"Meat & Seafood"},
   {"name":"lemon, juice and zest","amount":"1","unit":"lemon","aisle_category":"Produce"},
   {"name":"fresh parsley, chopped","amount":"0.25","unit":"cup","aisle_category":"Produce"},
   {"name":"parmesan cheese, freshly grated","amount":"2","unit":"oz","aisle_category":"Dairy & Eggs"},
   {"name":"salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"black pepper","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"}
 ]'::jsonb,
 ARRAY[
   'Bring a large pot of salted water to a boil. Cook spaghetti until al dente, about 8 minutes. Drain, reserving 1 cup pasta water.',
   'Heat olive oil and butter in a large skillet over medium-high heat until sizzling. Add garlic and red pepper flakes; cook 30 seconds until fragrant.',
   'Add shrimp and cook 3–4 minutes until just pink and cooked through. Remove skillet from heat.',
   'Add drained pasta and ¼ cup reserved pasta water; toss to coat, adding more water as needed to loosen the sauce.',
   'Stir in lemon juice, lemon zest, and parsley. Season with salt and pepper.',
   'Transfer to a serving bowl, top with parmesan, and serve immediately.'
 ],
 true, false, ARRAY[]::text[]),

-- 4. Beef and Broccoli Stir Fry
(NULL, NULL,
 'Easy Beef and Broccoli Stir Fry',
 'Tender flank steak and crisp broccoli coated in a rich soy-ginger sauce that beats takeout in just 20 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 10, 10, 20, 4,
 '[
   {"name":"flank steak, thinly sliced","amount":"1","unit":"lb","aisle_category":"Meat & Seafood"},
   {"name":"cornstarch, divided","amount":"3","unit":"tbsp","aisle_category":"Baking"},
   {"name":"low-sodium soy sauce","amount":"0.5","unit":"cup","aisle_category":"Condiments & Sauces"},
   {"name":"light brown sugar","amount":"3","unit":"tbsp","aisle_category":"Baking"},
   {"name":"garlic, minced","amount":"1","unit":"tbsp","aisle_category":"Produce"},
   {"name":"fresh ginger, grated","amount":"2","unit":"tsp","aisle_category":"Produce"},
   {"name":"vegetable oil, divided","amount":"2","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"broccoli florets","amount":"4","unit":"cup","aisle_category":"Produce"},
   {"name":"white onion, sliced","amount":"0.5","unit":"cup","aisle_category":"Produce"}
 ]'::jsonb,
 ARRAY[
   'Whisk 2 tbsp cornstarch with 3 tbsp water in a large bowl. Add beef, toss to coat, and let sit while you prep remaining ingredients.',
   'In a separate bowl, whisk remaining 1 tbsp cornstarch with soy sauce, brown sugar, garlic, and ginger. Set the sauce aside.',
   'Heat 1 tbsp oil in a large nonstick skillet over medium-high heat. Add beef and cook, stirring constantly, until almost cooked through. Transfer to a plate.',
   'Add remaining 1 tbsp oil to the pan. Add broccoli florets and onion; cook, stirring occasionally, until broccoli is bright green and just tender, about 4 minutes.',
   'Return beef to the pan, pour in the sauce, bring to a boil, and stir 1 minute until thickened. Serve over steamed rice.'
 ],
 true, false, ARRAY[]::text[]),

-- 5. Chicken Fried Rice
(NULL, NULL,
 'Chicken Fried Rice',
 'A fully loaded fried rice with chicken, egg, vegetables, and a savory sauce — better than takeout and ready in 20 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 10, 10, 20, 4,
 '[
   {"name":"day-old cooked white rice","amount":"2","unit":"cup","aisle_category":"Grains & Pasta"},
   {"name":"chicken breast, finely sliced","amount":"5","unit":"oz","aisle_category":"Meat & Seafood"},
   {"name":"eggs","amount":"2","unit":"large","aisle_category":"Dairy & Eggs"},
   {"name":"vegetable oil","amount":"2","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"garlic cloves, minced","amount":"2","unit":"cloves","aisle_category":"Produce"},
   {"name":"onion, finely chopped","amount":"0.5","unit":"medium","aisle_category":"Produce"},
   {"name":"small carrot, diced","amount":"1","unit":"carrot","aisle_category":"Produce"},
   {"name":"frozen peas","amount":"0.5","unit":"cup","aisle_category":"Frozen"},
   {"name":"frozen corn","amount":"0.5","unit":"cup","aisle_category":"Frozen"},
   {"name":"light soy sauce","amount":"3","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"oyster sauce","amount":"1","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"sesame oil","amount":"0.5","unit":"tsp","aisle_category":"Condiments & Sauces"}
 ]'::jsonb,
 ARRAY[
   'Combine soy sauce, oyster sauce, and sesame oil in a small bowl. Spoon 2 tsp of this sauce over the sliced chicken and toss to coat. Set aside.',
   'Heat 1 tbsp oil in a wok or large skillet over medium heat. Add eggs and scramble until just cooked (still slightly wet). Remove and set aside.',
   'Turn heat to high. Add remaining oil, then onion and garlic. Stir-fry 1 minute.',
   'Add carrot, peas, and corn. Cook 1 minute.',
   'Add chicken and cook, stirring, until no longer pink, about 1.5 minutes.',
   'Add rice and pour remaining sauce over everything. Stir-fry 1.5 minutes until rice is heated and coated evenly.',
   'Add scrambled egg back to the pan, toss to combine, and serve immediately.'
 ],
 true, false, ARRAY[]::text[]),

-- 6. Creamy Tomato Basil Soup
(NULL, NULL,
 'Creamy Tomato Basil Soup',
 'A rich, velvety tomato soup made from pantry staples with a swirl of cream and fresh basil — comforting and ready in 30 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 5, 25, 30, 8,
 '[
   {"name":"unsalted butter","amount":"4","unit":"tbsp","aisle_category":"Dairy & Eggs"},
   {"name":"yellow onions, finely chopped","amount":"2","unit":"medium","aisle_category":"Produce"},
   {"name":"garlic cloves, minced","amount":"3","unit":"cloves","aisle_category":"Produce"},
   {"name":"crushed tomatoes","amount":"56","unit":"oz","aisle_category":"Canned & Jarred"},
   {"name":"chicken or vegetable stock","amount":"2","unit":"cup","aisle_category":"Canned & Jarred"},
   {"name":"fresh basil, chopped","amount":"0.25","unit":"cup","aisle_category":"Produce"},
   {"name":"granulated sugar","amount":"1","unit":"tbsp","aisle_category":"Baking"},
   {"name":"heavy whipping cream","amount":"0.5","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"parmesan cheese, freshly grated","amount":"0.33","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"black pepper","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"}
 ]'::jsonb,
 ARRAY[
   'Melt butter in a large pot over medium heat. Add onions and sauté, stirring occasionally, 10–12 minutes until softened and golden.',
   'Add garlic and sauté 1 minute until fragrant.',
   'Add crushed tomatoes with their juices, chicken stock, basil, sugar, and black pepper. Stir to combine and bring to a boil.',
   'Reduce heat, partially cover, and simmer 10 minutes.',
   'Blend using an immersion blender until smooth, or carefully transfer in batches to a countertop blender.',
   'Return soup to medium heat. Stir in heavy cream and parmesan. Season with salt and pepper.',
   'Ladle into bowls and top with extra parmesan and fresh basil.'
 ],
 true, false, ARRAY[]::text[]),

-- 7. Ground Turkey Taco Skillet
(NULL, NULL,
 'Ground Turkey Taco Skillet',
 'A one-pan weeknight hero with seasoned ground turkey, black beans, fire-roasted tomatoes, and corn — serve straight from the skillet.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 5, 20, 25, 4,
 '[
   {"name":"olive oil","amount":"1","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"yellow onion, finely chopped","amount":"1","unit":"small","aisle_category":"Produce"},
   {"name":"ground turkey","amount":"1","unit":"lb","aisle_category":"Meat & Seafood"},
   {"name":"ground cumin","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"garlic powder","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"smoked paprika","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"black beans, drained and rinsed","amount":"15","unit":"oz","aisle_category":"Canned & Jarred"},
   {"name":"diced fire-roasted tomatoes","amount":"15","unit":"oz","aisle_category":"Canned & Jarred"},
   {"name":"frozen corn, defrosted","amount":"1","unit":"cup","aisle_category":"Frozen"},
   {"name":"kosher salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"}
 ]'::jsonb,
 ARRAY[
   'Heat olive oil over medium heat in a large skillet. Add onion and a pinch of salt; cook 3 minutes, stirring occasionally, until softened.',
   'Add ground turkey and break it up with a spoon. Sprinkle with cumin, garlic powder, smoked paprika, and half the remaining salt. Cook until browned and cooked through, about 8 minutes.',
   'Add black beans, tomatoes, corn, and remaining salt. Stir to combine.',
   'Reduce heat to medium-low and simmer 5 minutes to blend flavors.',
   'Serve as-is, or with tortillas, shredded cheese, sour cream, and avocado on the side.'
 ],
 true, false, ARRAY[]::text[]),

-- 8. Easy Black Bean Tacos
(NULL, NULL,
 'Easy Black Bean Tacos',
 'Quick vegetarian tacos with seasoned, creamy black beans, crisp cabbage, and a tangy yogurt lime crema — a satisfying meatless weeknight meal.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 15, 15, 30, 4,
 '[
   {"name":"canned black beans","amount":"2","unit":"cans","aisle_category":"Canned & Jarred"},
   {"name":"extra-virgin olive oil","amount":"2","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"garlic cloves, minced","amount":"2","unit":"cloves","aisle_category":"Produce"},
   {"name":"ground cumin","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"small corn or flour tortillas","amount":"10","unit":"tortillas","aisle_category":"Bakery"},
   {"name":"cabbage, finely sliced","amount":"3","unit":"cup","aisle_category":"Produce"},
   {"name":"plain Greek yogurt","amount":"1","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"fresh lime juice","amount":"2","unit":"tbsp","aisle_category":"Produce"},
   {"name":"cotija or feta cheese, crumbled","amount":"0.5","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"fresh cilantro","amount":"0.25","unit":"cup","aisle_category":"Produce"},
   {"name":"fine sea salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"}
 ]'::jsonb,
 ARRAY[
   'Warm olive oil in a small saucepan over medium-low heat. Add cumin, garlic, and ½ tsp salt; cook, stirring, until fragrant, about 30–60 seconds.',
   'Add one can of beans with its liquid. Stir and mash about half the beans with a potato masher. Once simmering, add the drained, rinsed second can. Stir to combine; cover on low heat.',
   'Make the crema: stir together yogurt, lime juice, and remaining ½ tsp salt. Set aside.',
   'Warm tortillas in batches in a dry skillet over medium heat, flipping once. Stack and cover with a towel to stay warm.',
   'Sprinkle cabbage with a pinch of salt and scrunch with your hands until slightly wilted.',
   'Assemble tacos: spread beans down each tortilla, top with cabbage, a drizzle of crema, crumbled cheese, and cilantro. Serve immediately.'
 ],
 true, false, ARRAY[]::text[]),

-- 9. Spaghetti Bolognese
(NULL, NULL,
 'Spaghetti Bolognese',
 'A quick but deeply satisfying meat sauce over spaghetti, built from pantry staples — a crowd-pleasing classic ready in 20 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 5, 15, 20, 4,
 '[
   {"name":"spaghetti","amount":"10","unit":"oz","aisle_category":"Grains & Pasta"},
   {"name":"olive oil","amount":"1","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"ground beef","amount":"1","unit":"lb","aisle_category":"Meat & Seafood"},
   {"name":"canned chopped tomatoes","amount":"14","unit":"oz","aisle_category":"Canned & Jarred"},
   {"name":"tomato paste","amount":"1","unit":"tbsp","aisle_category":"Canned & Jarred"},
   {"name":"beef stock cube","amount":"1","unit":"cube","aisle_category":"Canned & Jarred"},
   {"name":"water","amount":"0.5","unit":"cup","aisle_category":"Other"},
   {"name":"garlic cloves, minced","amount":"2","unit":"cloves","aisle_category":"Produce"},
   {"name":"dried oregano","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"salt","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"black pepper","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"parmesan cheese, grated","amount":"0.5","unit":"cup","aisle_category":"Dairy & Eggs"}
 ]'::jsonb,
 ARRAY[
   'Cook spaghetti according to package directions until al dente. Drain and set aside.',
   'Heat olive oil in a large skillet over high heat. Add ground beef, breaking it apart with a spatula, and cook 5 minutes until browned, stirring regularly.',
   'Add garlic and oregano; cook 30 seconds until fragrant.',
   'Stir in chopped tomatoes, tomato paste, and crumbled stock cube. Add water, bring to a boil, then reduce heat to medium and simmer 10 minutes until sauce thickens.',
   'Season with salt and pepper. Serve sauce over spaghetti and finish with grated parmesan.'
 ],
 true, false, ARRAY[]::text[]),

-- 10. Chicken Tikka Masala
(NULL, NULL,
 'Chicken Tikka Masala',
 'Tender chicken in a creamy, perfectly spiced tomato-based sauce — a restaurant-quality Indian favourite simplified to 30 minutes.',
 ARRAY['Surprise Me'], ARRAY[]::text[], 15, 15, 30, 4,
 '[
   {"name":"boneless skinless chicken breasts","amount":"1.5","unit":"lb","aisle_category":"Meat & Seafood"},
   {"name":"plain yogurt","amount":"0.5","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"garam masala","amount":"2","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"ground cumin","amount":"1","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"ground turmeric","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"chili powder","amount":"0.5","unit":"tsp","aisle_category":"Spices & Seasonings"},
   {"name":"vegetable oil","amount":"1","unit":"tbsp","aisle_category":"Condiments & Sauces"},
   {"name":"garlic cloves, minced","amount":"4","unit":"cloves","aisle_category":"Produce"},
   {"name":"fresh ginger, grated","amount":"1","unit":"tbsp","aisle_category":"Produce"},
   {"name":"canned tomato puree","amount":"2","unit":"cup","aisle_category":"Canned & Jarred"},
   {"name":"heavy cream","amount":"1","unit":"cup","aisle_category":"Dairy & Eggs"},
   {"name":"kosher salt","amount":"1.5","unit":"tsp","aisle_category":"Spices & Seasonings"}
 ]'::jsonb,
 ARRAY[
   'Cut chicken into bite-sized pieces. In a bowl, combine chicken with yogurt, 1 tsp garam masala, and ½ tsp salt. Stir to coat and marinate while you prep remaining ingredients.',
   'Heat oil in a large deep skillet over medium-high heat. Brown chicken in batches until golden on the outside (it does not need to be fully cooked through yet). Remove and set aside.',
   'To the same skillet, add garlic and ginger; stir-fry 30 seconds. Add remaining 1 tsp garam masala, cumin, turmeric, and chili powder; stir 30 seconds until fragrant.',
   'Add tomato puree and browned chicken. Simmer 10–12 minutes, stirring occasionally, until chicken is fully cooked and sauce reduces slightly.',
   'Stir in heavy cream and remaining salt. Simmer 2–3 minutes until sauce thickens. Serve over basmati rice, garnished with fresh cilantro.'
 ],
 true, false, ARRAY[]::text[]);
