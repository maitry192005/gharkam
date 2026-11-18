const fs = require('fs');
const path = require('path');
const https = require('https');

const targetDir = path.join(__dirname, '..', 'public', 'assets', 'images');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const images = [
  {
    name: 'hero-home.jpg',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    alt: 'Warm and spotless modern Indian home living space',
    photographer: 'R Architecture',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-cooking.jpg',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80',
    alt: 'Freshly prepared home cooked Indian food and culinary ingredients',
    photographer: 'Hari Nandakumar',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-cleaning.jpg',
    url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
    alt: 'Professional house cleaning and sanitization',
    photographer: 'Volodymyr Hryshchenko',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-utensils.jpg',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
    alt: 'Sparkling clean kitchen sink and washed dishes',
    photographer: 'CDC',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-laundry.jpg',
    url: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=800&q=80',
    alt: 'Neatly folded laundry and ironed clothes',
    photographer: 'Sarah Brown',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-electrician.jpg',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    alt: 'Skilled electrician testing home electrical breaker board',
    photographer: 'Emmanuel Ikwuegbu',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-plumber.jpg',
    url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
    alt: 'Professional plumber working on bathroom pipeline and fixtures',
    photographer: 'Jitendra Rajpurohit',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-babysitting.jpg',
    url: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
    alt: 'Attentive domestic nanny caring for a child at home',
    photographer: 'Picsea',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'service-elderly.jpg',
    url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80',
    alt: 'Compassionate caregiver supporting elderly family member',
    photographer: 'Dominik Lange',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'about-team.jpg',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    alt: 'GharKaam operations and verified partner onboarding team',
    photographer: 'Annie Spratt',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'customer-join.jpg',
    url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    alt: 'Happy homeowner enjoying relaxed lifestyle in clean home',
    photographer: 'Jason Briscoe',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'helper-join.jpg',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    alt: 'Independent domestic worker smiling and ready for opportunities',
    photographer: 'Christina @ wocintechchat.com',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'trust-safety.jpg',
    url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80',
    alt: 'Trust, police background check, and handshake verification',
    photographer: 'Cytonn Photography',
    license: 'Unsplash Free Commercial License'
  },
  {
    name: 'og-image.jpg',
    url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    alt: 'GharKaam banner showcasing beautiful home and verified helpers',
    photographer: 'Ralph (Ravi) Kayden',
    license: 'Unsplash Free Commercial License'
  }
];

function downloadFile(item) {
  return new Promise((resolve, reject) => {
    const dest = path.join(targetDir, item.name);
    const file = fs.createWriteStream(dest);

    https.get(item.url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        https.get(response.headers.location, redirectRes => {
          redirectRes.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`Downloaded ${item.name}`);
            resolve();
          });
        }).on('error', err => {
          fs.unlink(dest, () => {});
          reject(err);
        });
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${item.name}`);
        resolve();
      });
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function run() {
  console.log('Starting image downloads...');
  let creditsMd = `# GharKaam Photography & Asset Credits\n\nAll photos are royalty-free and sourced for high-quality domestic help marketplace representation under the free commercial Unsplash License.\n\n| File Name | Subject / Description | Photographer | Source / License |\n|---|---|---|---|\n`;

  for (const img of images) {
    try {
      await downloadFile(img);
      creditsMd += `| \`${img.name}\` | ${img.alt} | ${img.photographer} | [Unsplash License](${img.url}) |\n`;
    } catch (e) {
      console.error(`Failed to download ${img.name}:`, e.message);
    }
  }

  // Also create a favicon.ico copy / favicon.png from Gharkaam Logo.png if possible
  const logoPath = path.join(targetDir, 'Gharkaam Logo.png');
  const faviconPath = path.join(targetDir, 'favicon.png');
  if (fs.existsSync(logoPath) && !fs.existsSync(faviconPath)) {
    fs.copyFileSync(logoPath, faviconPath);
    console.log('Created favicon.png from logo');
  }

  fs.writeFileSync(path.join(targetDir, 'CREDITS.md'), creditsMd);
  console.log('CREDITS.md written successfully.');
}

run();
