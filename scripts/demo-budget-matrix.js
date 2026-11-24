// Illustrative sale listings: one example in each price band for each search city.
const photos = [
  "photo-1600607687939-ce8a6c25118c",
  "photo-1600607687920-4e2a09cf159d",
  "photo-1600566753086-00f18fb6b3ea",
  "photo-1600585154340-be6161a56a0c",
  "photo-1600210492486-724fe5c67fb0",
  "photo-1600607688969-a5bfcd646154"
];
const bands = ["under ₹50 lakh", "₹50 lakh to ₹1 crore", "₹1 crore to ₹2 crore", "₹2 crore and above"];
const cities = [
  { city: "Mumbai", state: "Maharashtra", homes: [
    ["Virar", "Virar Garden Apartments — Sample", 4250000, "Apartment", 2, 2, 820],
    ["Thane West", "Thane West Residence — Sample", 7600000, "Apartment", 2, 2, 1050],
    ["Powai", "Powai Family Home — Sample", 15000000, "Apartment", 3, 3, 1480],
    ["Bandra West", "Bandra Courtyard Villa — Sample", 25000000, "Villa", 3, 3, 2050]
  ]},
  { city: "Delhi", state: "Delhi", homes: [
    ["Uttam Nagar", "Uttam Nagar Apartments — Sample", 4400000, "Apartment", 2, 2, 900],
    ["Dwarka", "Dwarka Garden Residence — Sample", 8200000, "Apartment", 3, 2, 1240],
    ["Saket", "Saket Family House — Sample", 15000000, "Independent House", 3, 3, 1720],
    ["Greater Kailash", "Greater Kailash Villa — Sample", 25000000, "Villa", 4, 4, 2600]
  ]},
  { city: "Bangalore", state: "Karnataka", homes: [
    ["Electronic City", "Electronic City Apartments — Sample", 4800000, "Apartment", 2, 2, 980],
    ["Whitefield", "Whitefield Park Residence — Sample", 7800000, "Apartment", 2, 2, 1160],
    ["Indiranagar", "Indiranagar Courtyard Home — Sample", 15000000, "Independent House", 3, 3, 1850],
    ["Central Bengaluru", "Central Bengaluru Penthouse — Sample", 25000000, "Penthouse", 3, 3, 2400]
  ]},
  { city: "Pune", state: "Maharashtra", homes: [
    ["Wagholi", "Wagholi Family Apartments — Sample", 4600000, "Apartment", 2, 2, 940],
    ["Kharadi", "Kharadi Garden Residence — Sample", 7900000, "Apartment", 2, 2, 1120],
    ["Baner", "Baner Courtyard Villa — Sample", 15000000, "Villa", 3, 3, 1980],
    ["Koregaon Park", "Koregaon Park Garden Villa — Sample", 25000000, "Villa", 4, 4, 2850]
  ]}
];
module.exports = cities.flatMap((entry, cityIndex) => entry.homes.map((home, budgetIndex) => {
  const [location, title, price, propertyType, bedrooms, bathrooms, areaSqFt] = home;
  const image = "https://images.unsplash.com/" + photos[(cityIndex * 4 + budgetIndex) % photos.length] + "?auto=format&fit=crop&w=1400&q=85";
  return {
    id: "00000000-0000-4000-8000-" + String(cityIndex * 4 + budgetIndex + 14).padStart(12, "0"),
    title, description: "Illustrative demo listing to show the " + bands[budgetIndex] + " search range. This is sample website content, not a live real-estate offer.",
    propertyType, listingType: "Sale", price, location, city: entry.city, state: entry.state,
    address: location + ", " + entry.city, bedrooms, bathrooms, areaSqFt,
    mainImage: image, images: [image], amenities: ["Balcony", "Parking", "Security"], featured: false
  };
}));
