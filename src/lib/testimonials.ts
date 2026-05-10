// Testimonials von gesundheitscoaches.de
// Bilder werden direkt vom Wix-CDN geladen (stabile URLs).
// Wenn du Texte updaten willst: hier editieren. Build-Zeit-Update.

export type Testimonial = {
  name: string;
  age: string;
  city: string;
  quote: string;
  imageUrl: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Anne Lünnemann",
    age: "52 Jahre",
    city: "Neuenkirchen",
    quote:
      "Schon nach kurzer Zeit habe ich Gewicht reduziert, fühle mich fitter und ausgeglichener und habe weniger Gelenkschmerzen.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_a4e9490426d74a09867a7eb7e2309508~mv2.jpg/v1/fill/w_400,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_a4e9490426d74a09867a7eb7e2309508~mv2.jpg",
  },
  {
    name: "Guido Boll",
    age: "59 Jahre",
    city: "Vreden",
    quote:
      "Heute spüre ich die Veränderung in jeder Zelle. Ich bin deutlich kräftiger, fitter, motivierter – und habe endlich wieder Energie für das, was mir wichtig ist.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_a61d6452873d4e7ea40130eaec570168~mv2.jpg/v1/fill/w_400,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_a61d6452873d4e7ea40130eaec570168~mv2.jpg",
  },
  {
    name: "Kimberley Conner",
    age: "42 Jahre",
    city: "Ochtrup",
    quote:
      "Inzwischen habe ich 18 Kilogramm abgenommen. Ich fühle mich fitter und beweglicher denn je.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_08259ae8c4d3466ca7f833dab41868d8~mv2.jpg/v1/fill/w_400,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_08259ae8c4d3466ca7f833dab41868d8~mv2.jpg",
  },
  {
    name: "Lukas Bußmann",
    age: "24 Jahre",
    city: "Ochtrup",
    quote:
      "Ich habe insgesamt 33 kg abgenommen, habe mehr Ausdauer, ein besseres Körpergefühl und ein ganz anderes Bewusstsein für einen gesunden Lifestyle.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_89991d5f0db54844a477e0df14ee74fc~mv2.jpg/v1/fill/w_400,h_400,al_c,q_80,enc_avif,quality_auto/fe97c9_89991d5f0db54844a477e0df14ee74fc~mv2.jpg",
  },
  {
    name: "Conny Epping & Martina Wesker",
    age: "56+58 Jahre",
    city: "Ahaus",
    quote:
      "Keine Schulterschmerzen mehr, eine spürbar bessere Beweglichkeit und ein paar Kilos gingen auch noch runter. Durchgehalten und drangeblieben… wir haben es geschafft und fühlen uns superwohl.",
    imageUrl:
      "https://static.wixstatic.com/media/fe97c9_109bd1a1a41041b1a4d4ec5c43e1b5cd~mv2.png/v1/fill/w_400,h_400,al_c,q_85,enc_avif,quality_auto/fe97c9_109bd1a1a41041b1a4d4ec5c43e1b5cd~mv2.png",
  },
];
