export const defaultLanguage = "en";

export const languageStorageKey = "maison-shaimaa-language";

export const languages = [
  { code: "en", label: "EN", name: "English", direction: "ltr" },
  { code: "ar", label: "AR", name: "Arabic", direction: "rtl" },
  { code: "fr", label: "FR", name: "French", direction: "ltr" }
];

export const translations = {
  en: {
    nav: {
      order: "Order",
      sizeGuide: "Size guide",
      story: "Story",
      collection: "Collection",
      startOrder: "Start COD Order",
      about: "About",
      europe: "Europe",
      whatsapp: "WhatsApp us"
    },
    hero: {
      badge: "Limited Moroccan elegance",
      title: "Traditional djellaba, made to feel rare.",
      description:
        "Premium Moroccan pieces for women who want elegance, comfort, and identity in one refined silhouette. Reserve through WhatsApp and pay cash on delivery in Morocco.",
      primaryCta: "Reserve on WhatsApp",
      secondaryCta: "View collection",
      trustItems: ["COD Morocco", "Limited drops", "Size support"],
      editTitle: "The Eid Edit",
      editDescription:
        "A soft, polished capsule inspired by Moroccan salons, family gatherings, and quiet luxury.",
      imageAlt: "Premium Moroccan djellaba from Maison Shaimaa"
    },
    brandValue: {
      cards: [
        {
          title: "Trust-led ordering",
          text: "Simple WhatsApp reservation, personal sizing help, and cash on delivery in Morocco."
        },
        {
          title: "Moroccan identity",
          text: "Warm tones, traditional details, and styling that respects the origin of the piece."
        },
        {
          title: "Craft-first",
          text: "Clean silhouettes, refined trims, and pieces chosen for comfort and presence."
        }
      ]
    },
    collectionPreview: {
      label: "Collection preview",
      title: "Pieces customers can picture wearing.",
      text:
        "Explore a curated selection of Moroccan pieces designed for elegant occasions, personal sizing support, and cash on delivery in Morocco."
    },
    productCard: {
      viewDetails: "View details",
      photosSoon: "Photos soon",
      detailsAriaLabel: "View {productName} details",
      previewAlt: "{productName} product preview"
    },
    productDetail: {
      backToCollection: "Back to collection",
      eyebrow: "Maison Shaimaa product",
      title: "A closer look at a limited Moroccan piece.",
      text:
        "Each product page is designed to explain value first: fabric, finishing, fit, trust, and how to reserve with cash on delivery in Morocco.",
      priceLabel: "Price",
      codNote: "Pay cash on delivery in Morocco after your order details are confirmed on WhatsApp.",
      askWhatsapp: "Ask on WhatsApp",
      orderPiece: "Order this piece",
      trustItems: [
        "No online payment. Cash on delivery in Morocco.",
        "The team calls before dispatching your order.",
        "Need sizing help? Check the size guide or message us.",
        "Limited availability, no mass-store feel."
      ],
      openSizeGuide: "Open size guide",
      craftsmanship: "Craftsmanship",
      fabric: "Fabric",
      galleryStatusReady: "Limited Moroccan piece",
      galleryStatusSoon: "Final photos coming soon",
      galleryLabels: ["Full look", "Fabric mood", "Trim detail"],
      sizeLabel: "Size",
      sizeGuide: "Size guide",
      colorLabel: "Color",
      orderLabel: "Cash on delivery order",
      orderTitle: "Reserve this piece without leaving the page.",
      orderText: "Choose your color and size, then send a COD request. We confirm every detail before dispatch.",
      orderIntro:
        "This form is preselected for the product above. We use your details only to confirm the COD order and arrange delivery.",
      products: {
        "amina-ivory-djellaba": {
          name: "Amina Ivory Djellaba",
          tag: "Limited pieces",
          valueCopy:
            "Designed for women who want a refined Moroccan piece that feels graceful, modest, and special without looking mass-produced.",
          offer: "Includes personal size help before delivery",
          color: "Ivory silk blend",
          fabric: "Ivory silk blend with a smooth drape, soft touch, and light structure.",
          craftsmanship: ["Clean neckline finish", "Gold-tone Moroccan trim", "Relaxed elegant silhouette"],
          colors: { Ivory: "Ivory", Gold: "Gold" }
        },
        "zahra-coffee-djellaba": {
          name: "Zahra Coffee Djellaba",
          tag: "Hand-finished sfifa",
          valueCopy:
            "A deeper, dressier piece made for evenings, visits, and occasions where traditional elegance should feel elevated.",
          offer: "Limited drop with WhatsApp reservation",
          color: "Deep coffee crepe",
          fabric: "Deep coffee crepe with a comfortable fall and rich matte finish.",
          craftsmanship: ["Hand-finished sfifa feel", "Structured sleeve line", "Warm henna and brass accents"],
          colors: { Coffee: "Coffee", Henna: "Henna" }
        },
        "noor-olive-set": {
          name: "Noor Olive Set",
          tag: "Occasion ready",
          valueCopy:
            "A soft statement piece for customers who want Moroccan identity with a calm, modern color palette.",
          offer: "Occasion-ready styling support included",
          color: "Soft olive satin",
          fabric: "Soft olive satin with gentle shine and fluid movement.",
          craftsmanship: ["Soft satin finish", "Minimal premium detailing", "Easy occasion-ready drape"],
          colors: { Olive: "Olive", Ivory: "Ivory" }
        }
      }
    },
    sizeAdvisor: {
      prompt: "Not sure about your size? Use the Size Advisor",
      intro: "Quick guidance for djellaba and traditional Moroccan fits.",
      height: "Height in cm",
      weight: "Weight in kg",
      fitPreference: "Fit preference",
      quarterChest: "Quarter chest measurement",
      quarterChestHelper:
        "Common Moroccan djellaba measurement. Example: 28, 30, 32, 34. Leave empty if you do not know it.",
      usualSize: "Usual size",
      recommendedSize: "Recommended size",
      confirmation: "This is only an initial recommendation. We will confirm your size before dispatch.",
      confidenceLabels: {
        high: "High",
        medium: "Medium",
        "needs confirmation": "Needs confirmation"
      },
      fitPreferences: {
        fitted: "Fitted",
        regular: "Regular",
        relaxed: "Relaxed"
      },
      usualSizes: {
        unknown: "I do not know"
      },
      messages: {
        missing: "Enter your height and weight, or your quarter chest measurement, to receive a simple size suggestion.",
        quarterConfirm:
          "A quarter chest measurement of {quarter} needs direct confirmation before choosing a djellaba size.",
        quarterNote:
          "Based on your quarter chest measurement of {quarter}, {size} is the strongest size match.",
        relaxedFit: " We sized up because you prefer a relaxed traditional fit.",
        unavailable: " This size is not listed for the piece, so the team should confirm availability before dispatch.",
        usualSize: "your usual {usualSize} size",
        relaxedReason: "your relaxed fit preference",
        fittedReason: "your fitted fit preference",
        bodyNote: "Based on {height} cm and {weight} kg{detail}, {size} should give the most balanced djellaba fit.",
        withReasons: " with {reasons}",
        reasonJoiner: " and "
      }
    },
    story: {
      label: "Brand story",
      title: "A modern home for Moroccan traditional fashion.",
      paragraphs: [
        "Maison Shaimaa is built around one idea: traditional clothing should feel meaningful, premium, and easy to buy.",
        "The website speaks to customers who care about quality, elegant presentation, modest confidence, and pieces that do not feel mass-produced."
      ]
    },
    codTrust: {
      label: "Cash on delivery",
      title: "Trust before checkout.",
      text: "No online payment. We call to confirm your order, size, color, and address before dispatch. You pay only when the piece arrives.",
      steps: [
        {
          title: "Reserve",
          text: "Choose your piece, size, and color. You can ask for help before ordering."
        },
        {
          title: "Confirm",
          text: "Our team calls to confirm the phone number, city, address, and final details."
        },
        {
          title: "Deliver",
          text: "The order is delivered in Morocco. Payment is made in cash on arrival."
        }
      ]
    },
    sizeGuide: {
      label: "Size guide",
      title: "Choose the right fit before ordering.",
      text: "Customers can compare their usual size, then message you for a final recommendation before delivery.",
      advisorIntro: "Not sure which size to choose? Use the advisor below for an initial recommendation.",
      advisorNote: "This recommendation is only a guide. We will confirm your size before dispatch.",
      notes: [
        "Relaxed fit for petite silhouettes",
        "Most requested everyday fit",
        "Comfortable elegant drape",
        "Send height and usual size"
      ]
    },
    faq: {
      label: "FAQ",
      title: "Questions customers ask before ordering.",
      items: [
        {
          question: "Do I pay online?",
          answer: "No. We confirm your order first, and you pay only when the piece arrives."
        },
        {
          question: "What happens after I order?",
          answer:
            "Our team contacts you to confirm the product, size, color, address, and delivery details before dispatch."
        },
        {
          question: "I am not sure about my size. What should I do?",
          answer: "Use the Size Advisor or contact us on WhatsApp. We will confirm your size before dispatch."
        },
        {
          question: "Are quantities limited?",
          answer:
            "Yes. Each piece is available in limited quantities to keep the collection special and refined."
        }
      ]
    },
    footer: {
      ctaTitle: "Reserve your piece before the next limited drop closes.",
      ctaText:
        "Start with a simple WhatsApp message. No online payment is needed. Cash on delivery is confirmed by phone.",
      ctaButton: "Message Maison Shaimaa",
      brandText: "Premium Moroccan traditional fashion with COD ordering in Morocco.",
      whatsappSupport: "WhatsApp support",
      cards: [
        ["Confirmation", "We call before preparing delivery."],
        ["Delivery", "Morocco COD delivery flow."],
        ["Sizing", "Ask for fit help before ordering."]
      ]
    },
    stickyWhatsApp: {
      label: "Support",
      ariaLabel: "Contact Maison Shaimaa on WhatsApp"
    }
  },
  ar: {
    nav: {
      order: "اطلبي الآن",
      sizeGuide: "دليل المقاسات",
      story: "القصة",
      collection: "المجموعة",
      startOrder: "اطلبي بالدفع عند الاستلام",
      about: "عن الدار",
      europe: "أوروبا",
      whatsapp: "تواصلي معنا"
    },
    hero: {
      badge: "أناقة مغربية بإصدار محدود",
      title: "جلابة تقليدية بإحساس راق ومميز.",
      description:
        "قطع مغربية فاخرة للنساء اللواتي يبحثن عن الأناقة والراحة والهوية في تصميم واحد متناسق. احجزي عبر واتساب وادفعي عند الاستلام داخل المغرب.",
      primaryCta: "احجزي عبر واتساب",
      secondaryCta: "شاهدي المجموعة",
      trustItems: ["الدفع عند الاستلام", "إصدارات محدودة", "مساعدة في القياس"],
      editTitle: "اختيارات العيد",
      editDescription: "مجموعة ناعمة وراقية مستوحاة من الصالونات المغربية، اللقاءات العائلية، والفخامة الهادئة.",
      imageAlt: "جلابة مغربية فاخرة من Maison Shaimaa"
    },
    brandValue: {
      cards: [
        {
          title: "طلب مبني على الثقة",
          text: "حجز بسيط عبر واتساب، مساعدة شخصية في القياس، والدفع عند الاستلام داخل المغرب."
        },
        {
          title: "هوية مغربية أصيلة",
          text: "ألوان دافئة، تفاصيل تقليدية، ولمسة تحترم أصل القطعة وروحها المغربية."
        },
        {
          title: "قيمة الصنعة أولًا",
          text: "قصّات نظيفة، لمسات راقية، وقطع مختارة للراحة والحضور الأنيق."
        }
      ]
    },
    collectionPreview: {
      label: "لمحة عن المجموعة",
      title: "قطع تتخيلين نفسك ترتدينها بثقة.",
      text: "مجموعة مختارة بعناية من الجلابات والقطع المغربية الراقية، مع طلب سهل ومتابعة شخصية قبل الإرسال."
    },
    productCard: {
      viewDetails: "شاهدي التفاصيل",
      photosSoon: "الصور قريبًا",
      detailsAriaLabel: "شاهدي تفاصيل {productName}",
      previewAlt: "معاينة منتج {productName}"
    },
    productDetail: {
      backToCollection: "العودة إلى المجموعة",
      eyebrow: "قطعة من Maison Shaimaa",
      title: "نظرة أقرب على قطعة مغربية محدودة.",
      text: "كل صفحة منتج تبرز قيمة القطعة: القماش، اللمسات، القياس، الثقة، وطريقة الحجز بالدفع عند الاستلام داخل المغرب.",
      priceLabel: "السعر",
      codNote: "الدفع عند الاستلام داخل المغرب بعد تأكيد تفاصيل الطلب عبر واتساب.",
      askWhatsapp: "اسألي عبر واتساب",
      orderPiece: "اطلبي هذه القطعة",
      trustItems: [
        "لا يوجد دفع عبر الموقع. الدفع عند الاستلام داخل المغرب.",
        "يتصل بك الفريق قبل إرسال الطلب.",
        "تحتاجين مساعدة في القياس؟ افتحي دليل المقاسات أو راسلينا.",
        "توفر محدود، بعيد عن إحساس المنتجات المتكررة."
      ],
      openSizeGuide: "افتحي دليل المقاسات",
      craftsmanship: "الصنعة",
      fabric: "القماش",
      galleryStatusReady: "قطعة مغربية محدودة",
      galleryStatusSoon: "الصور النهائية قريبًا",
      galleryLabels: ["الإطلالة كاملة", "إحساس القماش", "تفاصيل اللمسة"],
      sizeLabel: "القياس",
      sizeGuide: "دليل المقاسات",
      colorLabel: "اللون",
      orderLabel: "طلب بالدفع عند الاستلام",
      orderTitle: "احجزي هذه القطعة دون مغادرة الصفحة.",
      orderText: "اختاري اللون والقياس، ثم أرسلي طلب الدفع عند الاستلام. نؤكد كل التفاصيل قبل الإرسال.",
      orderIntro: "هذا النموذج محدد مسبقًا للمنتج أعلاه. نستعمل معلوماتك فقط لتأكيد الطلب وترتيب التوصيل.",
      products: {
        "amina-ivory-djellaba": {
          name: "جلابة أمينة العاجية",
          tag: "قطع محدودة",
          valueCopy: "مصممة للمرأة التي تريد قطعة مغربية راقية، محتشمة، ومميزة دون أن تبدو كمنتج متكرر.",
          offer: "تشمل مساعدة شخصية في القياس قبل التوصيل",
          color: "مزيج حرير عاجي",
          fabric: "مزيج حرير عاجي بانسدال ناعم، ملمس لطيف، وبنية خفيفة.",
          craftsmanship: ["تشطيب نظيف للعنق", "لمسة مغربية ذهبية", "قصة مريحة وأنيقة"],
          colors: { Ivory: "عاجي", Gold: "ذهبي" }
        },
        "zahra-coffee-djellaba": {
          name: "جلابة زهرة بلون القهوة",
          tag: "سفيفة بلمسة يدوية",
          valueCopy: "قطعة أعمق وأكثر أناقة للمناسبات، الزيارات، واللحظات التي تحتاج حضورًا تقليديًا راقيًا.",
          offer: "إصدار محدود مع حجز عبر واتساب",
          color: "كريب بلون القهوة الداكنة",
          fabric: "كريب بلون القهوة الداكنة بانسدال مريح ولمسة مطفية غنية.",
          craftsmanship: ["إحساس سفيفة بلمسة يدوية", "خط أكمام منظم", "درجات دافئة من الحناء والنحاس"],
          colors: { Coffee: "قهوة", Henna: "حناء" }
        },
        "noor-olive-set": {
          name: "طقم نور الزيتوني",
          tag: "جاهز للمناسبات",
          valueCopy: "قطعة ناعمة بحضور هادئ للعميلات اللواتي يردن هوية مغربية بألوان عصرية متوازنة.",
          offer: "تشمل مساعدة في تنسيق الإطلالة للمناسبة",
          color: "ساتان زيتوني ناعم",
          fabric: "ساتان زيتوني ناعم بلمعة هادئة وحركة سلسة.",
          craftsmanship: ["لمسة ساتان ناعمة", "تفاصيل راقية وبسيطة", "انسدال سهل وجاهز للمناسبات"],
          colors: { Olive: "زيتوني", Ivory: "عاجي" }
        }
      }
    },
    sizeAdvisor: {
      prompt: "لستِ متأكدة من القياس؟ استعملي مساعد القياس",
      intro: "اقتراح سريع للجلابة واللباس التقليدي المغربي.",
      height: "الطول بالسنتيمتر",
      weight: "الوزن بالكيلوغرام",
      fitPreference: "تفضيل القصة",
      quarterChest: "شحال كتلبسي فالربع؟",
      quarterChestHelper: "قياس معروف فالجلابة المغربية. مثال: 28، 30، 32، 34. إلا ما عرفتيش، خليه فارغ.",
      usualSize: "قياسك المعتاد",
      recommendedSize: "القياس المقترح",
      confirmation: "هذا اقتراح مبدئي فقط، وسنؤكد معك القياس قبل الإرسال.",
      confidenceLabels: {
        high: "ثقة عالية",
        medium: "ثقة متوسطة",
        "needs confirmation": "يحتاج تأكيد"
      },
      fitPreferences: {
        fitted: "مضبوط",
        regular: "عادي",
        relaxed: "مريح"
      },
      usualSizes: {
        unknown: "لا أعرف"
      },
      messages: {
        missing: "أدخلي الطول والوزن، أو قياس الربع، للحصول على اقتراح بسيط للقياس.",
        quarterConfirm: "قياس الربع {quarter} يحتاج تأكيدًا مباشرًا قبل اختيار قياس الجلابة.",
        quarterNote: "اعتمادًا على قياس الربع {quarter}، قياس {size} هو الأقرب لك.",
        relaxedFit: " قمنا باقتراح قياس أكبر لأنك تفضلين قصة مريحة.",
        unavailable: " هذا القياس غير متوفر ضمن خيارات القطعة، لذلك سيؤكد الفريق التوفر قبل الإرسال.",
        usualSize: "قياسك المعتاد {usualSize}",
        relaxedReason: "تفضيلك للقصة المريحة",
        fittedReason: "تفضيلك للقصة المضبوطة",
        bodyNote: "اعتمادًا على طول {height} سم ووزن {weight} كغ{detail}، قياس {size} يعطيك توازنًا مناسبًا في الجلابة.",
        withReasons: " مع {reasons}",
        reasonJoiner: " و"
      }
    },
    story: {
      label: "قصة الدار",
      title: "بيت عصري للأزياء التقليدية المغربية.",
      paragraphs: [
        "تقوم Maison Shaimaa على فكرة بسيطة: اللباس التقليدي يستحق أن يكون ذا معنى، راقيًا، وسهل الطلب.",
        "نخاطب المرأة التي تقدّر الجودة، العرض الأنيق، الاحتشام الواثق، والقطع التي لا تشبه الإنتاج العادي المتكرر."
      ]
    },
    codTrust: {
      label: "الدفع عند الاستلام",
      title: "الثقة قبل الطلب.",
      text: "لن تدفعي أي شيء عبر الموقع. سنتصل بك لتأكيد الطلب، القياس، اللون، والعنوان قبل الإرسال. الدفع يكون فقط عند الاستلام.",
      steps: [
        {
          title: "اختاري",
          text: "اختاري القطعة، القياس، واللون. ويمكنك طلب المساعدة قبل تأكيد الطلب."
        },
        {
          title: "نؤكد",
          text: "يتواصل معك فريقنا لتأكيد رقم الهاتف، المدينة، العنوان، وجميع التفاصيل النهائية."
        },
        {
          title: "نرسل",
          text: "يصلك الطلب داخل المغرب، ويتم الدفع نقدًا عند الاستلام."
        }
      ]
    },
    sizeGuide: {
      label: "دليل المقاسات",
      title: "اختاري القياس المناسب قبل الطلب.",
      text: "يمكنك مقارنة قياسك المعتاد، ثم التواصل معنا للحصول على تأكيد نهائي قبل الإرسال.",
      advisorIntro: "ما متأكدة من القياس المناسب؟ استعملي المساعد أسفله باش يعطيك اقتراح مبدئي.",
      advisorNote: "هذا الاقتراح للمساعدة فقط. سنتأكد معك من القياس قبل إرسال الطلب.",
      notes: [
        "قصة مريحة للقامات الصغيرة",
        "القياس الأكثر طلبًا للاستعمال اليومي",
        "انسدال أنيق ومريح",
        "أرسلي الطول والقياس المعتاد"
      ]
    },
    faq: {
      label: "الأسئلة الشائعة",
      title: "أسئلة قبل إتمام الطلب.",
      items: [
        {
          question: "هل أؤدي عبر الموقع؟",
          answer: "لا. نقوم بتأكيد الطلب أولًا، والدفع يكون فقط عند الاستلام."
        },
        {
          question: "ماذا يحدث بعد الطلب؟",
          answer: "يتواصل معك فريقنا لتأكيد المنتج، القياس، اللون، العنوان، وتفاصيل التوصيل قبل الإرسال."
        },
        {
          question: "لست متأكدة من قياسي، ماذا أفعل؟",
          answer: "استعملي مساعد القياس أو تواصلي معنا على واتساب. سنتأكد معك من القياس قبل إرسال الطلب."
        },
        {
          question: "هل الكمية محدودة؟",
          answer: "نعم. كل قطعة متوفرة بكمية محدودة للحفاظ على تميز المجموعة وقيمتها."
        }
      ]
    },
    footer: {
      ctaTitle: "احجزي قطعتك قبل انتهاء الإصدار المحدود القادم.",
      ctaText: "ابدئي برسالة بسيطة على واتساب. لا يوجد دفع عبر الموقع، والدفع عند الاستلام يتم تأكيده عبر الهاتف.",
      ctaButton: "راسلي Maison Shaimaa",
      brandText: "أزياء مغربية تقليدية راقية مع طلب بالدفع عند الاستلام داخل المغرب.",
      whatsappSupport: "الدعم عبر واتساب",
      cards: [
        ["التأكيد", "نتصل بك قبل تحضير التوصيل."],
        ["التوصيل", "طلب بالدفع عند الاستلام داخل المغرب."],
        ["المقاسات", "اطلبي المساعدة في القياس قبل الطلب."]
      ]
    },
    stickyWhatsApp: {
      label: "الدعم",
      ariaLabel: "تواصلي مع Maison Shaimaa على واتساب"
    }
  },
  fr: {
    nav: {
      order: "Commander",
      sizeGuide: "Guide des tailles",
      story: "L’histoire",
      collection: "Collection",
      startOrder: "Commande COD",
      about: "La maison",
      europe: "Europe",
      whatsapp: "Nous contacter"
    },
    hero: {
      badge: "Élégance marocaine en édition limitée",
      title: "Djellaba traditionnelle, pensée pour être rare.",
      description:
        "Des pièces marocaines premium pour les femmes qui veulent élégance, confort et identité dans une silhouette raffinée. Réservez sur WhatsApp et payez à la livraison au Maroc.",
      primaryCta: "Réserver sur WhatsApp",
      secondaryCta: "Voir la collection",
      trustItems: ["Paiement à la livraison", "Éditions limitées", "Aide à la taille"],
      editTitle: "La sélection Eid",
      editDescription:
        "Une capsule douce et soignée, inspirée des salons marocains, des réunions de famille et du luxe discret.",
      imageAlt: "Djellaba marocaine premium de Maison Shaimaa"
    },
    brandValue: {
      cards: [
        {
          title: "Une commande basée sur la confiance",
          text: "Réservation simple via WhatsApp, aide personnalisée pour la taille et paiement à la livraison au Maroc."
        },
        {
          title: "Identité marocaine",
          text: "Des tons chaleureux, des détails traditionnels et une allure qui respecte l’origine de la pièce."
        },
        {
          title: "Le raffinement avant tout",
          text: "Des silhouettes propres, des finitions délicates et des pièces choisies pour le confort et la présence."
        }
      ]
    },
    collectionPreview: {
      label: "Aperçu de la collection",
      title: "Des pièces que l’on s’imagine porter.",
      text: "Une sélection de pièces marocaines raffinées, pensée pour une commande simple et un accompagnement personnel avant l’expédition."
    },
    productCard: {
      viewDetails: "Voir les détails",
      photosSoon: "Photos bientôt",
      detailsAriaLabel: "Voir les détails de {productName}",
      previewAlt: "Aperçu du produit {productName}"
    },
    productDetail: {
      backToCollection: "Retour à la collection",
      eyebrow: "Produit Maison Shaimaa",
      title: "Un regard plus proche sur une pièce marocaine en édition limitée.",
      text:
        "Chaque page produit met en avant la valeur de la pièce : le tissu, les finitions, la coupe, la confiance et la réservation avec paiement à la livraison au Maroc.",
      priceLabel: "Prix",
      codNote: "Payez à la livraison au Maroc après confirmation de votre commande sur WhatsApp.",
      askWhatsapp: "Demander sur WhatsApp",
      orderPiece: "Commander cette pièce",
      trustItems: [
        "Aucun paiement en ligne. Paiement à la livraison au Maroc.",
        "L’équipe vous appelle avant l’expédition.",
        "Besoin d’aide pour la taille ? Consultez le guide ou écrivez-nous.",
        "Disponibilité limitée, loin d’un effet grande série."
      ],
      openSizeGuide: "Ouvrir le guide des tailles",
      craftsmanship: "Savoir-faire",
      fabric: "Tissu",
      galleryStatusReady: "Pièce marocaine limitée",
      galleryStatusSoon: "Photos finales bientôt disponibles",
      galleryLabels: ["Silhouette complète", "Esprit du tissu", "Détail de finition"],
      sizeLabel: "Taille",
      sizeGuide: "Guide des tailles",
      colorLabel: "Couleur",
      orderLabel: "Commande avec paiement à la livraison",
      orderTitle: "Réservez cette pièce sans quitter la page.",
      orderText:
        "Choisissez la couleur et la taille, puis envoyez votre demande COD. Nous confirmons chaque détail avant l’expédition.",
      orderIntro:
        "Ce formulaire est déjà sélectionné pour le produit ci-dessus. Nous utilisons vos informations uniquement pour confirmer la commande et organiser la livraison.",
      products: {
        "amina-ivory-djellaba": {
          name: "Djellaba Amina ivoire",
          tag: "Pièces limitées",
          valueCopy:
            "Pensée pour les femmes qui veulent une pièce marocaine raffinée, gracieuse, pudique et spéciale, sans impression de production de masse.",
          offer: "Aide personnelle pour la taille avant livraison",
          color: "Mélange soie ivoire",
          fabric: "Mélange soie ivoire au tombé fluide, au toucher doux et à la structure légère.",
          craftsmanship: ["Finition nette de l’encolure", "Galon marocain doré", "Silhouette ample et élégante"],
          colors: { Ivory: "Ivoire", Gold: "Doré" }
        },
        "zahra-coffee-djellaba": {
          name: "Djellaba Zahra café",
          tag: "Sfifa finie à la main",
          valueCopy:
            "Une pièce plus profonde et habillée, faite pour les soirées, les visites et les moments où l’élégance traditionnelle doit s’élever.",
          offer: "Drop limité avec réservation WhatsApp",
          color: "Crêpe café profond",
          fabric: "Crêpe café profond avec un tombé confortable et un fini mat riche.",
          craftsmanship: ["Esprit sfifa finie à la main", "Ligne de manche structurée", "Accents chauds henné et laiton"],
          colors: { Coffee: "Café", Henna: "Henné" }
        },
        "noor-olive-set": {
          name: "Ensemble Noor olive",
          tag: "Prêt pour les occasions",
          valueCopy:
            "Une pièce douce et affirmée pour les clientes qui veulent une identité marocaine dans une palette calme et moderne.",
          offer: "Conseil de style pour occasion inclus",
          color: "Satin olive doux",
          fabric: "Satin olive doux, légèrement lumineux, avec un mouvement fluide.",
          craftsmanship: ["Fini satin doux", "Détails premium minimalistes", "Tombé facile, prêt pour les occasions"],
          colors: { Olive: "Olive", Ivory: "Ivoire" }
        }
      }
    },
    sizeAdvisor: {
      prompt: "Vous hésitez sur la taille ? Utilisez le conseiller taille",
      intro: "Un conseil rapide pour la djellaba et les tenues traditionnelles marocaines.",
      height: "Taille en cm",
      weight: "Poids en kg",
      fitPreference: "Préférence de coupe",
      quarterChest: "Mesure du quart de poitrine",
      quarterChestHelper:
        "Mesure courante pour la djellaba marocaine. Exemple : 28, 30, 32, 34. Laissez vide si vous ne la connaissez pas.",
      usualSize: "Taille habituelle",
      recommendedSize: "Taille recommandée",
      confirmation: "Ceci est seulement une recommandation initiale. Nous confirmerons votre taille avant l’expédition.",
      confidenceLabels: {
        high: "Élevée",
        medium: "Moyenne",
        "needs confirmation": "À confirmer"
      },
      fitPreferences: {
        fitted: "Ajustée",
        regular: "Normale",
        relaxed: "Ample"
      },
      usualSizes: {
        unknown: "Je ne sais pas"
      },
      messages: {
        missing: "Indiquez votre taille et votre poids, ou votre quart de poitrine, pour recevoir une suggestion simple.",
        quarterConfirm:
          "Une mesure du quart de poitrine de {quarter} doit être confirmée directement avant de choisir la taille.",
        quarterNote:
          "D’après votre mesure du quart de poitrine de {quarter}, la taille {size} est la correspondance la plus forte.",
        relaxedFit: " Nous avons conseillé une taille au-dessus parce que vous préférez une coupe ample.",
        unavailable:
          " Cette taille n’est pas listée pour cette pièce, l’équipe confirmera donc la disponibilité avant l’expédition.",
        usualSize: "votre taille habituelle {usualSize}",
        relaxedReason: "votre préférence pour une coupe ample",
        fittedReason: "votre préférence pour une coupe ajustée",
        bodyNote:
          "D’après {height} cm et {weight} kg{detail}, la taille {size} devrait offrir l’équilibre le plus juste pour une djellaba.",
        withReasons: " avec {reasons}",
        reasonJoiner: " et "
      }
    },
    story: {
      label: "Histoire de la maison",
      title: "Une maison moderne pour la mode traditionnelle marocaine.",
      paragraphs: [
        "Maison Shaimaa repose sur une idée simple : le vêtement traditionnel doit être chargé de sens, premium et facile à commander.",
        "Le site s’adresse aux clientes qui recherchent la qualité, une présentation élégante, une confiance discrète et des pièces loin de la production de masse."
      ]
    },
    codTrust: {
      label: "Paiement à la livraison",
      title: "La confiance avant la commande.",
      text: "Aucun paiement en ligne. Nous vous appelons pour confirmer la commande, la taille, la couleur et l’adresse avant l’expédition. Vous payez uniquement à la livraison.",
      steps: [
        {
          title: "Réserver",
          text: "Choisissez votre pièce, votre taille et votre couleur. Vous pouvez demander de l’aide avant de commander."
        },
        {
          title: "Confirmer",
          text: "Notre équipe appelle pour confirmer le téléphone, la ville, l’adresse et les derniers détails."
        },
        {
          title: "Livrer",
          text: "La commande est livrée au Maroc. Le paiement se fait en espèces à l’arrivée."
        }
      ]
    },
    sizeGuide: {
      label: "Guide des tailles",
      title: "Choisir la bonne coupe avant de commander.",
      text: "Comparez votre taille habituelle, puis contactez-nous pour une recommandation finale avant la livraison.",
      advisorIntro:
        "Vous hésitez sur la taille ? Utilisez le guide ci-dessous pour obtenir une première recommandation.",
      advisorNote: "Cette recommandation est indicative. Nous confirmerons votre taille avant l’expédition.",
      notes: [
        "Coupe souple pour les silhouettes menues",
        "La taille la plus demandée au quotidien",
        "Un tombé élégant et confortable",
        "Envoyez votre taille et votre taille habituelle"
      ]
    },
    faq: {
      label: "FAQ",
      title: "Les questions avant de commander.",
      items: [
        {
          question: "Est-ce que je paie en ligne ?",
          answer: "Non. Nous confirmons d’abord votre commande, puis vous payez uniquement à la livraison."
        },
        {
          question: "Que se passe-t-il après ma commande ?",
          answer:
            "Notre équipe vous contacte pour confirmer le produit, la taille, la couleur, l’adresse et les détails de livraison avant l’expédition."
        },
        {
          question: "Je ne suis pas sûre de ma taille. Que faire ?",
          answer:
            "Utilisez le guide de taille ou contactez-nous sur WhatsApp. Nous confirmerons votre taille avant l’expédition."
        },
        {
          question: "Les quantités sont-elles limitées ?",
          answer:
            "Oui. Chaque pièce est disponible en quantité limitée afin de préserver le caractère exclusif de la collection."
        }
      ]
    },
    footer: {
      ctaTitle: "Réservez votre pièce avant la fermeture du prochain drop limité.",
      ctaText:
        "Commencez par un simple message WhatsApp. Aucun paiement en ligne n’est nécessaire. Le paiement à la livraison est confirmé par téléphone.",
      ctaButton: "Écrire à Maison Shaimaa",
      brandText: "Mode traditionnelle marocaine premium avec commande et paiement à la livraison au Maroc.",
      whatsappSupport: "Support WhatsApp",
      cards: [
        ["Confirmation", "Nous appelons avant de préparer la livraison."],
        ["Livraison", "Parcours de livraison COD au Maroc."],
        ["Taille", "Demandez de l’aide pour la coupe avant de commander."]
      ]
    },
    stickyWhatsApp: {
      label: "Support",
      ariaLabel: "Contacter Maison Shaimaa sur WhatsApp"
    }
  }
};

const orderAndThankYouTranslations = {
  en: {
    orderForm: {
      title: "Complete your order",
      intro:
        "Leave your details below. We will call you to confirm the product, size, color, address, and delivery before dispatch.",
      selectedProduct: "Selected product",
      product: "Product",
      fullName: "Full name",
      phoneNumber: "Phone number",
      city: "City",
      fullAddress: "Full address",
      color: "Color",
      size: "Size",
      quantity: "Quantity",
      notes: "Notes",
      fullNamePlaceholder: "Full name",
      phonePlaceholder: "06XXXXXXXX",
      cityPlaceholder: "City",
      addressPlaceholder: "Street, building, neighborhood",
      notesPlaceholder: "Optional note about size, delivery, or preferred contact time",
      submit: "Confirm My Order",
      loading: "Sending your order...",
      help: "Need help before ordering?",
      trust: "No online payment. You pay only when the piece arrives.",
      trustItems: [
        "No online payment. You pay only when the piece arrives.",
        "We call to confirm size, address, and availability.",
        "Payment is cash on delivery."
      ],
      summaryTitle: "Order summary",
      productPrice: "Product price",
      selectedColor: "Selected color",
      selectedSize: "Selected size",
      codPayment: "COD payment",
      codPaymentText: "No online payment. Pay in cash when the order arrives.",
      summarySelectionNote: "Selected product, color, and size will be sent with your order.",
      summaryNote: "After a successful submit, we will contact you to confirm the order before dispatch.",
      error: "Something went wrong. Please try again or contact us on WhatsApp.",
      validation: {
        general: "Please check the highlighted fields and try again.",
        fullName: "Please enter your full name.",
        fullNameSuspicious: "Please enter a real full name using letters only.",
        phoneNumber: "Please enter a valid Moroccan phone number, for example 06XXXXXXXX or +2126XXXXXXXX.",
        phoneSuspicious: "Please enter a valid personal Moroccan mobile number.",
        city: "Please enter your delivery city.",
        fullAddress: "Please enter a clear full delivery address.",
        fullAddressSuspicious: "Please enter a clear delivery address with street, building, or neighborhood details.",
        product: "Please choose a product.",
        color: "Please choose an available color.",
        size: "Please choose an available size.",
        quantity: "Please enter a valid quantity.",
        quantityTooHigh: "For COD orders, please choose a quantity between 1 and 3."
      }
    },
    orderPage: {
      badge: "Cash on delivery in Morocco",
      title: "Reserve your Moroccan piece with confidence.",
      text:
        "No online payment is required. After you send the request, the team calls to confirm your product, size, address, and delivery details before dispatch.",
      cards: [
        ["No online payment", "You do not enter card details on this site."],
        ["Confirmation call", "We confirm size, color, address, and phone number."],
        ["COD delivery", "You pay cash when your order arrives."]
      ],
      sizeGuide: "Check the size guide before ordering"
    },
    thankYou: {
      eyebrow: "Order received",
      title: "Your order has been received.",
      message:
        "No online payment was taken. Our team will call you to confirm the product, size, color, address, and delivery details. You pay cash on delivery.",
      cards: [
        ["No online payment", "You did not pay by card or checkout online."],
        ["Confirmation call", "We confirm every COD order before preparing it."],
        ["Pay on delivery", "You pay in cash only when the order arrives."]
      ],
      whatsapp: "Contact us on WhatsApp",
      return: "Return to products"
    }
  },
  ar: {
    orderForm: {
      title: "أكملي طلبك",
      intro: "اتركي معلوماتك أسفله، وسنتصل بك لتأكيد المنتج، القياس، اللون، العنوان، والتوصيل قبل الإرسال.",
      selectedProduct: "المنتج المختار",
      product: "المنتج",
      fullName: "الاسم الكامل",
      phoneNumber: "رقم الهاتف",
      city: "المدينة",
      fullAddress: "العنوان الكامل",
      color: "اللون",
      size: "القياس",
      quantity: "الكمية",
      notes: "ملاحظات",
      fullNamePlaceholder: "الاسم الكامل",
      phonePlaceholder: "06XXXXXXXX",
      cityPlaceholder: "المدينة",
      addressPlaceholder: "الحي، الشارع، رقم المنزل",
      notesPlaceholder: "ملاحظة اختيارية حول القياس، التوصيل، أو الوقت المناسب للتواصل",
      submit: "تأكيد الطلب",
      loading: "جاري إرسال الطلب...",
      help: "تحتاجين مساعدة قبل الطلب؟",
      trust: "لا يوجد دفع عبر الموقع. الدفع يكون فقط عند الاستلام.",
      trustItems: [
        "لا يوجد دفع عبر الموقع. الدفع يكون فقط عند الاستلام.",
        "نتصل بك لتأكيد القياس، العنوان، والتوفر.",
        "الدفع يكون نقدًا عند الاستلام."
      ],
      summaryTitle: "ملخص الطلب",
      productPrice: "سعر المنتج",
      selectedColor: "اللون المختار",
      selectedSize: "القياس المختار",
      codPayment: "الدفع عند الاستلام",
      codPaymentText: "لا يوجد دفع عبر الموقع. الدفع نقدًا عند وصول الطلب.",
      summarySelectionNote: "سيتم إرسال المنتج، اللون، والقياس المختار مع طلبك.",
      summaryNote: "بعد إرسال الطلب بنجاح، سنتواصل معك لتأكيد التفاصيل قبل الإرسال.",
      error: "وقع مشكل أثناء إرسال الطلب. حاولي مرة أخرى أو تواصلي معنا على واتساب.",
      validation: {
        general: "المرجو مراجعة الخانات المشار إليها والمحاولة مرة أخرى.",
        fullName: "المرجو إدخال الاسم الكامل.",
        fullNameSuspicious: "المرجو إدخال اسم حقيقي باستعمال الحروف فقط.",
        phoneNumber: "المرجو إدخال رقم هاتف مغربي صحيح، مثل 06XXXXXXXX أو +2126XXXXXXXX.",
        phoneSuspicious: "المرجو إدخال رقم هاتف مغربي شخصي وصحيح.",
        city: "المرجو إدخال مدينة التوصيل.",
        fullAddress: "المرجو إدخال عنوان كامل وواضح.",
        fullAddressSuspicious: "المرجو إدخال عنوان توصيل واضح يتضمن الشارع، الحي، أو رقم المنزل.",
        product: "المرجو اختيار المنتج.",
        color: "المرجو اختيار لون متوفر.",
        size: "المرجو اختيار قياس متوفر.",
        quantity: "المرجو إدخال كمية صحيحة.",
        quantityTooHigh: "بالنسبة لطلبات الدفع عند الاستلام، المرجو اختيار كمية بين 1 و3."
      }
    },
    orderPage: {
      badge: "الدفع عند الاستلام داخل المغرب",
      title: "احجزي قطعتك المغربية بثقة.",
      text: "لا يوجد دفع عبر الموقع. بعد إرسال الطلب، يتصل بك الفريق لتأكيد المنتج، القياس، العنوان، وتفاصيل التوصيل قبل الإرسال.",
      cards: [
        ["لا دفع عبر الموقع", "لا تحتاجين لإدخال معلومات البطاقة في الموقع."],
        ["مكالمة تأكيد", "نؤكد القياس، اللون، العنوان، ورقم الهاتف."],
        ["توصيل بالدفع عند الاستلام", "تدفعين نقدًا عند وصول الطلب."]
      ],
      sizeGuide: "راجعي دليل المقاسات قبل الطلب"
    },
    thankYou: {
      eyebrow: "تم تسجيل الطلب",
      title: "تم تسجيل طلبك بنجاح.",
      message:
        "لم يتم أخذ أي دفع عبر الموقع. سيتصل بك فريقنا لتأكيد المنتج، القياس، اللون، العنوان، وتفاصيل التوصيل. الدفع يكون عند الاستلام.",
      cards: [
        ["لا دفع عبر الموقع", "لم تدفعي بالبطاقة أو عبر أي Checkout إلكتروني."],
        ["مكالمة تأكيد", "نؤكد كل طلب بالدفع عند الاستلام قبل تحضيره."],
        ["الدفع عند الاستلام", "تدفعين نقدًا فقط عند وصول الطلب."]
      ],
      whatsapp: "تواصلي معنا على واتساب",
      return: "الرجوع إلى المنتجات"
    }
  },
  fr: {
    orderForm: {
      title: "Finaliser votre commande",
      intro:
        "Laissez vos informations ci-dessous. Nous vous appellerons pour confirmer le produit, la taille, la couleur, l’adresse et la livraison avant l’expédition.",
      selectedProduct: "Produit sélectionné",
      product: "Produit",
      fullName: "Nom complet",
      phoneNumber: "Numéro de téléphone",
      city: "Ville",
      fullAddress: "Adresse complète",
      color: "Couleur",
      size: "Taille",
      quantity: "Quantité",
      notes: "Notes",
      fullNamePlaceholder: "Nom complet",
      phonePlaceholder: "06XXXXXXXX",
      cityPlaceholder: "Ville",
      addressPlaceholder: "Rue, immeuble, quartier",
      notesPlaceholder: "Note optionnelle sur la taille, la livraison ou le moment idéal pour vous contacter",
      submit: "Confirmer ma commande",
      loading: "Envoi de votre commande...",
      help: "Besoin d’aide avant de commander ?",
      trust: "Aucun paiement en ligne. Vous payez uniquement lorsque la pièce arrive.",
      trustItems: [
        "Aucun paiement en ligne. Vous payez uniquement lorsque la pièce arrive.",
        "Nous appelons pour confirmer la taille, l’adresse et la disponibilité.",
        "Le paiement se fait à la livraison."
      ],
      summaryTitle: "Résumé de la commande",
      productPrice: "Prix du produit",
      selectedColor: "Couleur sélectionnée",
      selectedSize: "Taille sélectionnée",
      codPayment: "Paiement à la livraison",
      codPaymentText: "Aucun paiement en ligne. Vous payez en espèces à l’arrivée de la commande.",
      summarySelectionNote: "Le produit, la couleur et la taille sélectionnés seront envoyés avec votre commande.",
      summaryNote:
        "Après l’envoi réussi, nous vous contacterons pour confirmer la commande avant l’expédition.",
      error: "Une erreur est survenue. Veuillez réessayer ou nous contacter sur WhatsApp.",
      validation: {
        general: "Veuillez vérifier les champs indiqués puis réessayer.",
        fullName: "Veuillez entrer votre nom complet.",
        fullNameSuspicious: "Veuillez entrer un vrai nom complet avec des lettres uniquement.",
        phoneNumber: "Veuillez entrer un numéro marocain valide, par exemple 06XXXXXXXX ou +2126XXXXXXXX.",
        phoneSuspicious: "Veuillez entrer un numéro mobile marocain personnel et valide.",
        city: "Veuillez entrer la ville de livraison.",
        fullAddress: "Veuillez entrer une adresse complète et claire.",
        fullAddressSuspicious: "Veuillez entrer une adresse de livraison claire avec rue, immeuble ou quartier.",
        product: "Veuillez choisir un produit.",
        color: "Veuillez choisir une couleur disponible.",
        size: "Veuillez choisir une taille disponible.",
        quantity: "Veuillez entrer une quantité valide.",
        quantityTooHigh: "Pour les commandes à la livraison, veuillez choisir une quantité entre 1 et 3."
      }
    },
    orderPage: {
      badge: "Paiement à la livraison au Maroc",
      title: "Réservez votre pièce marocaine en toute confiance.",
      text:
        "Aucun paiement en ligne n’est requis. Après l’envoi de votre demande, l’équipe vous appelle pour confirmer le produit, la taille, l’adresse et la livraison avant l’expédition.",
      cards: [
        ["Aucun paiement en ligne", "Vous ne saisissez aucune information de carte sur ce site."],
        ["Appel de confirmation", "Nous confirmons la taille, la couleur, l’adresse et le téléphone."],
        ["Livraison COD", "Vous payez en espèces lorsque la commande arrive."]
      ],
      sizeGuide: "Consulter le guide des tailles avant de commander"
    },
    thankYou: {
      eyebrow: "Commande reçue",
      title: "Votre commande a bien été reçue.",
      message:
        "Aucun paiement en ligne n’a été effectué. Notre équipe vous appellera pour confirmer le produit, la taille, la couleur, l’adresse et les détails de livraison. Le paiement se fait à la livraison.",
      cards: [
        ["Aucun paiement en ligne", "Vous n’avez pas payé par carte ni via un checkout en ligne."],
        ["Appel de confirmation", "Nous confirmons chaque commande COD avant de la préparer."],
        ["Paiement à la livraison", "Vous payez en espèces uniquement à l’arrivée de la commande."]
      ],
      whatsapp: "Nous contacter sur WhatsApp",
      return: "Retour aux produits"
    }
  }
};

Object.assign(translations.en, orderAndThankYouTranslations.en);
Object.assign(translations.ar, orderAndThankYouTranslations.ar);
Object.assign(translations.fr, orderAndThankYouTranslations.fr);

const trackingTranslations = {
  en: {
    navLabel: "Track order",
    page: {
      formLabel: "Order tracking",
      title: "Track your COD order.",
      intro:
        "Enter your Order ID and phone number. For your privacy, we only show a status when both details match.",
      orderIdLabel: "Order ID",
      orderIdPlaceholder: "MS-20260509-120000",
      phoneLabel: "Phone number",
      phonePlaceholder: "06XXXXXXXX",
      submit: "Check status",
      loading: "Checking status...",
      privacy: "We never show your name, address, notes, or private order details on this page.",
      whatsapp: "Contact us on WhatsApp",
      resultLabel: "Tracking result",
      emptyResult: "Your order status will appear here after a successful match.",
      orderStatus: "Order status",
      deliveryStatus: "Delivery status",
      lastUpdated: "Last updated",
      notFound: "We could not find an order matching those details. Please check the Order ID and phone number.",
      serviceError: "Tracking is not available right now. Please try again later or contact us on WhatsApp.",
      validation: {
        orderId: "Please enter a valid Order ID.",
        phoneNumber: "Please enter a valid Moroccan phone number."
      },
      statuses: {
        New: "New",
        Confirmed: "Confirmed",
        Preparing: "Preparing",
        Dispatched: "Dispatched",
        "Out for delivery": "Out for delivery",
        Delivered: "Delivered",
        "Could not reach customer": "Could not reach customer",
        Cancelled: "Cancelled",
        Returned: "Returned"
      },
      statusMessages: {
        New: "Your order request has been received and is waiting for confirmation.",
        Confirmed: "Your order has been confirmed by our team.",
        Preparing: "Your piece is being prepared before dispatch.",
        Dispatched: "Your order has left our preparation flow and is on the way.",
        "Out for delivery": "Your order is out for delivery. Please keep your phone available.",
        Delivered: "Your order has been delivered. Thank you for choosing Maison Shaimaa.",
        "Could not reach customer": "We could not reach you. Please contact us on WhatsApp to confirm delivery.",
        Cancelled: "This order is marked as cancelled. Contact us if you need help.",
        Returned: "This order is marked as returned. Contact us if you need help."
      }
    }
  },
  ar: {
    navLabel: "تتبعي الطلب",
    page: {
      formLabel: "تتبع الطلب",
      title: "تتبعي طلبك بالدفع عند الاستلام.",
      intro: "أدخلي رقم الطلب ورقم الهاتف. حفاظًا على خصوصيتك، نظهر الحالة فقط إذا تطابقت المعلومتان.",
      orderIdLabel: "رقم الطلب",
      orderIdPlaceholder: "MS-20260509-120000",
      phoneLabel: "رقم الهاتف",
      phonePlaceholder: "06XXXXXXXX",
      submit: "تتبع الحالة",
      loading: "جاري التحقق...",
      privacy: "لا نعرض الاسم، العنوان، الملاحظات، أو أي تفاصيل خاصة بالطلب في هذه الصفحة.",
      whatsapp: "تواصلي معنا على واتساب",
      resultLabel: "نتيجة التتبع",
      emptyResult: "ستظهر حالة الطلب هنا بعد تطابق رقم الطلب ورقم الهاتف.",
      orderStatus: "حالة الطلب",
      deliveryStatus: "حالة التوصيل",
      lastUpdated: "آخر تحديث",
      notFound: "لم نتمكن من العثور على طلب مطابق لهذه المعلومات. تأكدي من رقم الطلب ورقم الهاتف.",
      serviceError: "خدمة التتبع غير متاحة حاليًا. حاولي لاحقًا أو تواصلي معنا على واتساب.",
      validation: {
        orderId: "المرجو إدخال رقم طلب صحيح.",
        phoneNumber: "المرجو إدخال رقم هاتف مغربي صحيح."
      },
      statuses: {
        New: "جديد",
        Confirmed: "تم التأكيد",
        Preparing: "قيد التحضير",
        Dispatched: "تم الإرسال",
        "Out for delivery": "في طريق التوصيل",
        Delivered: "تم التسليم",
        "Could not reach customer": "تعذر التواصل مع الزبونة",
        Cancelled: "ملغي",
        Returned: "راجع"
      },
      statusMessages: {
        New: "تم استلام طلبك وهو في انتظار التأكيد.",
        Confirmed: "تم تأكيد طلبك من طرف فريقنا.",
        Preparing: "يتم تحضير قطعتك قبل الإرسال.",
        Dispatched: "تم إرسال طلبك وهو في طريقه إليك.",
        "Out for delivery": "طلبك في طريق التوصيل. المرجو إبقاء الهاتف متاحًا.",
        Delivered: "تم تسليم طلبك. شكرًا لاختيارك Maison Shaimaa.",
        "Could not reach customer": "لم نتمكن من التواصل معك. المرجو مراسلتنا على واتساب لتأكيد التوصيل.",
        Cancelled: "هذا الطلب مسجل كملغي. تواصلي معنا إذا احتجتِ للمساعدة.",
        Returned: "هذا الطلب مسجل كراجع. تواصلي معنا إذا احتجتِ للمساعدة."
      }
    }
  },
  fr: {
    navLabel: "Suivre ma commande",
    page: {
      formLabel: "Suivi de commande",
      title: "Suivre votre commande COD.",
      intro:
        "Entrez votre numéro de commande et votre numéro de téléphone. Pour votre confidentialité, le statut s’affiche uniquement si les deux informations correspondent.",
      orderIdLabel: "Numéro de commande",
      orderIdPlaceholder: "MS-20260509-120000",
      phoneLabel: "Numéro de téléphone",
      phonePlaceholder: "06XXXXXXXX",
      submit: "Vérifier le statut",
      loading: "Vérification en cours...",
      privacy: "Nous n’affichons jamais votre nom, adresse, notes ou détails privés de commande sur cette page.",
      whatsapp: "Nous contacter sur WhatsApp",
      resultLabel: "Résultat du suivi",
      emptyResult: "Le statut de votre commande apparaîtra ici après une correspondance réussie.",
      orderStatus: "Statut de commande",
      deliveryStatus: "Statut de livraison",
      lastUpdated: "Dernière mise à jour",
      notFound:
        "Nous n’avons pas trouvé de commande correspondant à ces informations. Vérifiez le numéro de commande et le téléphone.",
      serviceError:
        "Le suivi n’est pas disponible pour le moment. Veuillez réessayer plus tard ou nous contacter sur WhatsApp.",
      validation: {
        orderId: "Veuillez entrer un numéro de commande valide.",
        phoneNumber: "Veuillez entrer un numéro marocain valide."
      },
      statuses: {
        New: "Nouvelle",
        Confirmed: "Confirmée",
        Preparing: "En préparation",
        Dispatched: "Expédiée",
        "Out for delivery": "En cours de livraison",
        Delivered: "Livrée",
        "Could not reach customer": "Cliente injoignable",
        Cancelled: "Annulée",
        Returned: "Retournée"
      },
      statusMessages: {
        New: "Votre demande de commande a été reçue et attend confirmation.",
        Confirmed: "Votre commande a été confirmée par notre équipe.",
        Preparing: "Votre pièce est en préparation avant l’expédition.",
        Dispatched: "Votre commande a quitté la préparation et est en route.",
        "Out for delivery": "Votre commande est en cours de livraison. Gardez votre téléphone disponible.",
        Delivered: "Votre commande a été livrée. Merci d’avoir choisi Maison Shaimaa.",
        "Could not reach customer": "Nous n’avons pas pu vous joindre. Contactez-nous sur WhatsApp pour confirmer la livraison.",
        Cancelled: "Cette commande est marquée comme annulée. Contactez-nous si vous avez besoin d’aide.",
        Returned: "Cette commande est marquée comme retournée. Contactez-nous si vous avez besoin d’aide."
      }
    }
  }
};

translations.en.nav.trackOrder = trackingTranslations.en.navLabel;
translations.ar.nav.trackOrder = trackingTranslations.ar.navLabel;
translations.fr.nav.trackOrder = trackingTranslations.fr.navLabel;
translations.en.trackOrder = trackingTranslations.en.page;
translations.ar.trackOrder = trackingTranslations.ar.page;
translations.fr.trackOrder = trackingTranslations.fr.page;

const productObjectionTranslations = {
  en: {
    trustIntro: "Quick answers before you order.",
    availableColorsTitle: "Available colors",
    availableColorsText: "This model is currently shown in: {colors}. Ask us on WhatsApp if you want help choosing.",
    priceTitle: "Price",
    priceText: "The listed price is {price}. No online payment is required.",
    deliveryTitle: "Delivery",
    deliveryText: "Delivery is available in Morocco. We confirm the city and address before dispatch.",
    codTitle: "Cash on delivery",
    codText: "You pay only when the piece arrives and the order has been confirmed by phone.",
    craftLabel: "Sewing and craftsmanship",
    craftTitle: "Made to feel polished, modest, and special.",
    craftText:
      "Each piece is selected for its drape, finishing, and traditional Moroccan presence, with details explained clearly before you order.",
    relatedLabel: "Other models",
    relatedTitle: "Explore more pieces from the collection.",
    relatedText: "If this color or cut is not your first choice, these limited models may suit your occasion.",
    relatedCta: "View this model",
    faqLabel: "Product questions",
    faqTitle: "Short answers before ordering.",
    faqItems: [
      {
        question: "Are other colors available?",
        answer: "The available colors for this piece are: {colors}. You can ask on WhatsApp before ordering."
      },
      {
        question: "Are other models available?",
        answer: "Yes. You can view other limited models from the same collection below this section."
      },
      {
        question: "What is the price?",
        answer: "The current listed price is {price}. The team confirms availability before dispatch."
      },
      {
        question: "Is delivery and cash on delivery available?",
        answer: "Yes. Delivery is available in Morocco, and you pay cash when the piece arrives."
      },
      {
        question: "How long does delivery take?",
        answer: "Delivery timing depends on the city. We confirm the address and expected timing by phone or WhatsApp."
      },
      {
        question: "What type of sewing or craftsmanship is used?",
        answer: "The piece focuses on clean finishing, refined traditional details, and an elegant Moroccan silhouette."
      }
    ]
  },
  ar: {
    trustIntro: "أجوبة سريعة قبل الطلب.",
    availableColorsTitle: "الألوان المتوفرة",
    availableColorsText: "هذا الموديل متوفر حاليًا في: {colors}. يمكنك مراسلتنا على واتساب للمساعدة في الاختيار.",
    priceTitle: "السعر",
    priceText: "السعر المعروض هو {price}. لا يوجد دفع عبر الموقع.",
    deliveryTitle: "التوصيل",
    deliveryText: "التوصيل متوفر داخل المغرب. نؤكد المدينة والعنوان قبل إرسال الطلب.",
    codTitle: "الدفع عند الاستلام",
    codText: "تدفعين فقط عند وصول القطعة وبعد تأكيد الطلب عبر الهاتف.",
    craftLabel: "الخياطة والصنعة",
    craftTitle: "قطعة مصممة لتبدو راقية، محتشمة، ومميزة.",
    craftText:
      "كل قطعة يتم اختيارها حسب الانسدال، التشطيب، والحضور المغربي التقليدي، مع توضيح التفاصيل قبل الطلب.",
    relatedLabel: "موديلات أخرى",
    relatedTitle: "اكتشفي قطعًا أخرى من المجموعة.",
    relatedText: "إذا لم يكن هذا اللون أو القص مناسبًا لك، فقد تناسبك هذه الموديلات المحدودة لمناسبتك.",
    relatedCta: "شاهدي هذا الموديل",
    faqLabel: "أسئلة حول المنتج",
    faqTitle: "أجوبة مختصرة قبل الطلب.",
    faqItems: [
      {
        question: "هل توجد ألوان أخرى؟",
        answer: "الألوان المتوفرة لهذه القطعة هي: {colors}. يمكنك السؤال على واتساب قبل الطلب."
      },
      {
        question: "هل توجد موديلات أخرى؟",
        answer: "نعم. يمكنك مشاهدة موديلات محدودة أخرى من نفس المجموعة أسفل هذا القسم."
      },
      {
        question: "ما هو السعر؟",
        answer: "السعر الحالي هو {price}. يقوم الفريق بتأكيد التوفر قبل الإرسال."
      },
      {
        question: "هل التوصيل والدفع عند الاستلام متوفران؟",
        answer: "نعم. التوصيل متوفر داخل المغرب، والدفع يكون نقدًا عند وصول القطعة."
      },
      {
        question: "كم يستغرق التوصيل؟",
        answer: "مدة التوصيل تعتمد على المدينة. نؤكد العنوان والمدة المتوقعة عبر الهاتف أو واتساب."
      },
      {
        question: "ما نوع الخياطة أو الصنعة؟",
        answer: "تركز القطعة على تشطيب نظيف، تفاصيل تقليدية راقية، وقصة مغربية أنيقة."
      }
    ]
  },
  fr: {
    trustIntro: "Réponses rapides avant de commander.",
    availableColorsTitle: "Couleurs disponibles",
    availableColorsText:
      "Ce modèle est actuellement présenté en : {colors}. Vous pouvez nous écrire sur WhatsApp pour choisir.",
    priceTitle: "Prix",
    priceText: "Le prix affiché est {price}. Aucun paiement en ligne n’est demandé.",
    deliveryTitle: "Livraison",
    deliveryText: "La livraison est disponible au Maroc. Nous confirmons la ville et l’adresse avant l’expédition.",
    codTitle: "Paiement à la livraison",
    codText: "Vous payez uniquement à l’arrivée de la pièce, après confirmation par téléphone.",
    craftLabel: "Couture et savoir-faire",
    craftTitle: "Une pièce pensée pour être soignée, pudique et spéciale.",
    craftText:
      "Chaque pièce est choisie pour son tombé, ses finitions et sa présence marocaine traditionnelle, avec des détails clarifiés avant la commande.",
    relatedLabel: "Autres modèles",
    relatedTitle: "Découvrez d’autres pièces de la collection.",
    relatedText: "Si cette couleur ou cette coupe n’est pas votre premier choix, ces modèles limités peuvent convenir.",
    relatedCta: "Voir ce modèle",
    faqLabel: "Questions produit",
    faqTitle: "Réponses courtes avant de commander.",
    faqItems: [
      {
        question: "D’autres couleurs sont-elles disponibles ?",
        answer: "Les couleurs disponibles pour cette pièce sont : {colors}. Vous pouvez demander conseil sur WhatsApp."
      },
      {
        question: "D’autres modèles sont-ils disponibles ?",
        answer: "Oui. Vous pouvez découvrir d’autres modèles limités de la collection juste en dessous."
      },
      {
        question: "Quel est le prix ?",
        answer: "Le prix actuellement affiché est {price}. L’équipe confirme la disponibilité avant l’expédition."
      },
      {
        question: "La livraison et le paiement à la livraison sont-ils disponibles ?",
        answer: "Oui. La livraison est disponible au Maroc et vous payez en espèces à l’arrivée de la pièce."
      },
      {
        question: "Combien de temps prend la livraison ?",
        answer: "Le délai dépend de la ville. Nous confirmons l’adresse et le délai estimé par téléphone ou WhatsApp."
      },
      {
        question: "Quel type de couture ou de savoir-faire est utilisé ?",
        answer: "La pièce met l’accent sur des finitions propres, des détails traditionnels raffinés et une silhouette marocaine élégante."
      }
    ]
  }
};

translations.en.productDetail.objections = productObjectionTranslations.en;
translations.ar.productDetail.objections = productObjectionTranslations.ar;
translations.fr.productDetail.objections = productObjectionTranslations.fr;

const productPersuasionTranslations = {
  en: {
    valueLabel: "Why it is worth it",
    valueTitle: "A piece chosen for presence, comfort, and Moroccan elegance.",
    valueDescription:
      "At {price}, the value is in the fabric feel, clean finishing, traditional detail, and the confidence of wearing something made for special moments.",
    valueCards: [
      {
        title: "Refined finishing",
        text: "Clean lines and thoughtful details help the piece feel polished without looking overdone."
      },
      {
        title: "Premium fabric feel",
        text: "The selected fabric is presented for comfort, drape, and a graceful occasion-ready look."
      },
      {
        title: "Occasion value",
        text: "A traditional piece can serve visits, family gatherings, and moments where elegance matters."
      }
    ],
    identityLabel: "For the woman wearing it",
    identityTitle: "Elegance with dignity and Moroccan identity.",
    identityDescription:
      "This page is designed for a customer who wants to feel graceful, confident, modest, and connected to Moroccan tradition without feeling ordinary.",
    urgencyLabel: "Availability note",
    urgencyTitle: "Choose your preferred color before availability changes.",
    urgencyDescription:
      "These pieces are not presented as mass stock. Colors and sizes such as {colors} may change as orders are confirmed, so choosing early helps the team reserve the right option for you.",
    stepsLabel: "Simple decision",
    stepsTitle: "Four calm steps to order.",
    steps: [
      {
        title: "Choose color",
        text: "Pick the color that best suits your occasion and styling."
      },
      {
        title: "Choose size",
        text: "Use the size selector or Size Advisor if you need guidance."
      },
      {
        title: "Enter details",
        text: "Add your phone, city, address, quantity, and optional notes."
      },
      {
        title: "Confirm order",
        text: "The team calls before dispatch so your order is checked clearly."
      }
    ],
    reassuranceLabel: "Order reassurance",
    reassuranceTitle: "A safer COD flow, without online payment.",
    reassuranceItems: [
      "No online payment is required.",
      "You pay when the piece is delivered.",
      "Delivery details and fee are confirmed before dispatch.",
      "You can add notes if you need sizing or timing help."
    ],
    trackOrderCta: "Track your order after confirmation"
  },
  ar: {
    valueLabel: "لماذا تستحق القطعة",
    valueTitle: "قطعة مختارة للحضور، الراحة، والأناقة المغربية.",
    valueDescription:
      "بقيمة {price}، تكمن أهمية القطعة في إحساس القماش، التشطيب النظيف، التفاصيل التقليدية، والثقة عند ارتدائها في اللحظات الخاصة.",
    valueCards: [
      {
        title: "تشطيب راق",
        text: "خطوط نظيفة وتفاصيل مدروسة تجعل القطعة أنيقة دون مبالغة."
      },
      {
        title: "إحساس قماش مميز",
        text: "القماش المختار يمنح راحة، انسدالًا جميلًا، وإطلالة مناسبة للمناسبات."
      },
      {
        title: "قيمة للمناسبات",
        text: "القطعة التقليدية يمكن أن ترافق الزيارات، الجمعات العائلية، واللحظات التي تحتاج أناقة."
      }
    ],
    identityLabel: "للمرأة التي ترتديها",
    identityTitle: "أناقة بوقار وهوية مغربية.",
    identityDescription:
      "هذه الصفحة صممت لزبونة تريد أن تشعر بالرقي، الثقة، الاحتشام، والانتماء للذوق المغربي دون أن تبدو إطلالتها عادية.",
    urgencyLabel: "ملاحظة حول التوفر",
    urgencyTitle: "اختاري اللون المفضل قبل أن يتغير التوفر.",
    urgencyDescription:
      "هذه القطع لا تعرض ككمية كبيرة ومتكررة. الألوان والقياسات مثل {colors} قد تتغير مع تأكيد الطلبات، لذلك يساعد الاختيار المبكر الفريق على حجز الخيار المناسب لك.",
    stepsLabel: "قرار بسيط",
    stepsTitle: "أربع خطوات هادئة لإتمام الطلب.",
    steps: [
      {
        title: "اختاري اللون",
        text: "اختاري اللون الذي يناسب مناسبتك وطريقة تنسيقك."
      },
      {
        title: "اختاري القياس",
        text: "استعملي اختيار القياس أو مساعد القياس إذا احتجتِ إرشادًا."
      },
      {
        title: "أدخلي المعلومات",
        text: "أضيفي الهاتف، المدينة، العنوان، الكمية، وأي ملاحظة اختيارية."
      },
      {
        title: "أكدي الطلب",
        text: "يتصل بك الفريق قبل الإرسال حتى يتم التأكد من الطلب بوضوح."
      }
    ],
    reassuranceLabel: "طمأنة قبل الطلب",
    reassuranceTitle: "طلب بالدفع عند الاستلام، دون دفع عبر الموقع.",
    reassuranceItems: [
      "لا يوجد دفع عبر الموقع.",
      "الدفع يكون عند وصول القطعة.",
      "يتم تأكيد تفاصيل التوصيل والثمن قبل الإرسال.",
      "يمكنك إضافة ملاحظات إذا احتجتِ مساعدة في القياس أو وقت التواصل."
    ],
    trackOrderCta: "تتبعي طلبك بعد التأكيد"
  },
  fr: {
    valueLabel: "Pourquoi cette pièce a de la valeur",
    valueTitle: "Une pièce choisie pour la présence, le confort et l’élégance marocaine.",
    valueDescription:
      "À {price}, la valeur se trouve dans le toucher du tissu, les finitions propres, le détail traditionnel et la confiance d’une pièce pensée pour les moments importants.",
    valueCards: [
      {
        title: "Finitions soignées",
        text: "Des lignes propres et des détails réfléchis donnent une allure élégante sans excès."
      },
      {
        title: "Sensation premium du tissu",
        text: "Le tissu est présenté pour son confort, son tombé et son allure prête pour les occasions."
      },
      {
        title: "Valeur d’occasion",
        text: "Une pièce traditionnelle peut accompagner les visites, les réunions de famille et les moments élégants."
      }
    ],
    identityLabel: "Pour la femme qui la porte",
    identityTitle: "Élégance, dignité et identité marocaine.",
    identityDescription:
      "Cette page s’adresse à une cliente qui veut se sentir gracieuse, confiante, pudique et liée à la tradition marocaine sans paraître ordinaire.",
    urgencyLabel: "Note de disponibilité",
    urgencyTitle: "Choisissez votre couleur préférée avant que la disponibilité change.",
    urgencyDescription:
      "Ces pièces ne sont pas présentées comme un stock de masse. Les couleurs et tailles comme {colors} peuvent évoluer au fil des confirmations, donc choisir tôt aide l’équipe à réserver la bonne option.",
    stepsLabel: "Décision simple",
    stepsTitle: "Quatre étapes calmes pour commander.",
    steps: [
      {
        title: "Choisir la couleur",
        text: "Sélectionnez la couleur qui convient à votre occasion et à votre style."
      },
      {
        title: "Choisir la taille",
        text: "Utilisez le sélecteur ou le conseiller taille si vous avez besoin d’aide."
      },
      {
        title: "Entrer les détails",
        text: "Ajoutez votre téléphone, ville, adresse, quantité et notes optionnelles."
      },
      {
        title: "Confirmer la commande",
        text: "L’équipe appelle avant l’expédition pour vérifier la commande clairement."
      }
    ],
    reassuranceLabel: "Réassurance commande",
    reassuranceTitle: "Un parcours COD plus rassurant, sans paiement en ligne.",
    reassuranceItems: [
      "Aucun paiement en ligne n’est requis.",
      "Vous payez lorsque la pièce est livrée.",
      "Les détails et les frais de livraison sont confirmés avant l’expédition.",
      "Vous pouvez ajouter des notes pour la taille ou l’heure de contact."
    ],
    trackOrderCta: "Suivre votre commande après confirmation"
  }
};

translations.en.productDetail.productPersuasion = productPersuasionTranslations.en;
translations.ar.productDetail.productPersuasion = productPersuasionTranslations.ar;
translations.fr.productDetail.productPersuasion = productPersuasionTranslations.fr;

translations.en.nav.orderWhatsappAria = "Order on WhatsApp";
translations.ar.nav.orderWhatsappAria = "اطلبي عبر واتساب";
translations.fr.nav.orderWhatsappAria = "Commander sur WhatsApp";
translations.en.nav.openMenu = "Open menu";
translations.ar.nav.openMenu = "افتحي القائمة";
translations.fr.nav.openMenu = "Ouvrir le menu";
translations.en.nav.closeMenu = "Close menu";
translations.ar.nav.closeMenu = "إغلاق القائمة";
translations.fr.nav.closeMenu = "Fermer le menu";

translations.en.productsPage = {
  label: "Collection",
  title: "Limited Moroccan pieces",
  text:
    "Browse premium djellabas and traditional Moroccan pieces. Choose your model, size, and color, then order with cash on delivery in Morocco.",
  categories: {
    djellabas: "Djellabas",
    sets: "Sets",
    limitedPieces: "Limited pieces"
  }
};

translations.ar.productsPage = {
  label: "المجموعة",
  title: "قطع مغربية بإصدار محدود",
  text:
    "اكتشفي جلّابات وقطع مغربية راقية. اختاري الموديل، القياس، واللون، ثم أكملي الطلب بالدفع عند الاستلام داخل المغرب.",
  categories: {
    djellabas: "جلّابات",
    sets: "أطقم",
    limitedPieces: "قطع محدودة"
  }
};

translations.fr.productsPage = {
  label: "Collection",
  title: "Pièces marocaines en édition limitée",
  text:
    "Découvrez des djellabas et pièces marocaines raffinées. Choisissez le modèle, la taille et la couleur, puis commandez avec paiement à la livraison au Maroc.",
  categories: {
    djellabas: "Djellabas",
    sets: "Ensembles",
    limitedPieces: "Pièces limitées"
  }
};

translations.en.languageSwitcher = {
  label: "Choose language",
  switchTo: "Switch to {language}"
};
translations.ar.languageSwitcher = {
  label: "اختيار اللغة",
  switchTo: "التبديل إلى {language}"
};
translations.fr.languageSwitcher = {
  label: "Choisir la langue",
  switchTo: "Passer à {language}"
};

translations.en.aboutPage = {
  label: "About",
  title: "Moroccan tradition, presented with modern elegance",
  text: "Maison Shaimaa is a premium brand experience for djellaba and Moroccan traditional clothing."
};
translations.ar.aboutPage = {
  label: "عن الدار",
  title: "تقاليد مغربية بلمسة عصرية راقية",
  text: "Maison Shaimaa تجربة راقية للجلّابات واللباس المغربي التقليدي."
};
translations.fr.aboutPage = {
  label: "À propos",
  title: "La tradition marocaine avec une élégance moderne",
  text: "Maison Shaimaa propose une expérience premium autour de la djellaba et du vêtement traditionnel marocain."
};

translations.en.europePage = {
  label: "Europe",
  title: "Future Europe pre-orders",
  text: "This page is only for future planning. No European payment or shipping system is connected yet.",
  fullName: "Full name",
  email: "Email",
  country: "Country in Europe",
  note: "Europe interest note",
  notePlaceholder: "What pieces are you interested in?",
  submit: "Join interest list"
};
translations.ar.europePage = {
  label: "أوروبا",
  title: "طلبات أوروبا مستقبلًا",
  text: "هذه الصفحة للتخطيط فقط. لا يوجد حاليًا نظام دفع أو شحن خاص بأوروبا.",
  fullName: "الاسم الكامل",
  email: "البريد الإلكتروني",
  country: "الدولة في أوروبا",
  note: "ملاحظة حول الاهتمام",
  notePlaceholder: "ما نوع القطع التي تهمك؟",
  submit: "الانضمام إلى قائمة الاهتمام"
};
translations.fr.europePage = {
  label: "Europe",
  title: "Précommandes Europe à venir",
  text: "Cette page sert uniquement à la préparation. Aucun paiement ni système d’expédition européen n’est connecté pour le moment.",
  fullName: "Nom complet",
  email: "Email",
  country: "Pays en Europe",
  note: "Note d’intérêt Europe",
  notePlaceholder: "Quelles pièces vous intéressent ?",
  submit: "Rejoindre la liste d’intérêt"
};

translations.en.collectionPreview.text =
  "Explore a curated selection of Moroccan pieces designed for elegant occasions, personal sizing support, and cash on delivery in Morocco.";
translations.ar.collectionPreview.text =
  "اكتشفي مجموعة مختارة من القطع المغربية الراقية للمناسبات، مع مساعدة في القياس والدفع عند الاستلام داخل المغرب.";
translations.fr.collectionPreview.text =
  "Découvrez une sélection raffinée de pièces marocaines pour vos occasions, avec aide à la taille et paiement à la livraison au Maroc.";

translations.en.orderForm.summaryNote =
  "After a successful submit, we will contact you to confirm the order before dispatch.";
translations.ar.orderForm.summaryNote =
  "بعد إرسال الطلب بنجاح، سنتواصل معك لتأكيد التفاصيل قبل الإرسال.";
translations.fr.orderForm.summaryNote =
  "Après l’envoi réussi, nous vous contacterons pour confirmer la commande avant l’expédition.";

export function getLanguageConfig(languageCode) {
  return languages.find((language) => language.code === languageCode) || languages[0];
}

export function normalizeLanguage(languageCode) {
  return getLanguageConfig(languageCode).code;
}

export function getLanguageDirection(languageCode) {
  return getLanguageConfig(languageCode).direction;
}

export function getTranslation(languageCode) {
  return translations[normalizeLanguage(languageCode)] || translations[defaultLanguage];
}
