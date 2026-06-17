# Le Moteur Sentinel Massar 🚀
**Un Framework Agentique Orienté Événements pour la Navigation dans l'Écosystème Entrepreneuriat en Tunisie**

> **Équipe Massar (Hackathon AINS 2026) :** > Youssef Mhamdi | Mayssam Hergli | Youssef Atig | Seif Bhiri | Senda Derouiche

---

## 📑 Résumé
La navigation au sein de l'écosystème entrepreneurial en Tunisie se heurte à des barrières critiques dues à la fragmentation de l'information et à un décalage de perception concernant la maturité des projets. Nous présentons **Massar**, un framework IA de qualité production, orienté événements et fondé sur une architecture d'orchestration multi-agents. Intégrant un diagnostic adaptatif, une évaluation multidimensionnelle explicable, de l'intelligence documentaire et un routage de feuille de route basé sur la Génération Augmentée par Récupération (RAG), ce système offre une plateforme d'orientation concrète et factuelle pour les startups tunisiennes.

---

## 🌍 1. Introduction
La mission centrale de la plateforme Massar est de remédier au déconnecte structurel où plus de 120 000 porteurs de projets actifs en Tunisie restent invisibles face aux programmes d'appui institutionnels disponibles. Bien qu'il existe localement plus de 41 initiatives complètes d'accélération, d'incubation et de soutien financier, 96% des entreprises actives fonctionnent comme des PME traditionnelles manquant de visibilité sur leur trajectoire d'évolution optimale. 

Massar agit comme un **co-fondateur numérique intelligent**, comblant le fossé entre le potentiel brut et les ressources institutionnelles stratégiques grâce à une approche agentique axée sur les données.

---

## ⚙️ 2. Architecture du Système
L'architecture du système est conçue pour une haute disponibilité et un traitement asynchrone, s'appuyant sur un modèle découplé orienté événements afin de séparer les lourdes charges d'inférence des flux d'interaction utilisateur. 

![Architecture Massar](./image_2925c3.png)
*(Assurez-vous que l'image `image_2925c3.png` est bien à la racine de votre dépôt GitHub pour qu'elle s'affiche correctement)*

L'intelligence sous-jacente est répartie sur quatre modules profondément intégrés :

* **Moteur de Diagnostic Adaptatif (MS1) :** Implémente une logique de questionnaire dynamique et arborescente pour classer la maturité du projet selon une taxonomie rigoureuse en 6 stades. Ce module détecte de manière autonome les écarts de perception entre l'auto-évaluation du fondateur et la réalité structurelle, évitant ainsi la soumission prématurée de candidatures.
* **Moteur d'Évaluation Explicable (MS2) :** Calcule cinq scores composites distincts couvrant la validation du marché, la viabilité commerciale, l'intensité de l'innovation, la scalabilité et un Green Score spécialisé. Chaque calcul génère des justifications transparentes en langage naturel, ancrées dans les données déclaratives.
* **Pipeline RAG Ancré (MS3) :** Utilise la recherche sémantique `pgvector` par rapport à un référentiel vérifié de plus de 41 programmes d'appui de l'écosystème tunisien. En imposant des contraintes strictes sur les métadonnées, il génère des feuilles de route temporelles sans hallucination, citant précisément les autorités structurelles sources.
* **Intelligence Documentaire (MS4) :** Intègre un traitement multimodal via l'API Claude Vision pour analyser les documents au format PDF, PNG et JPEG importés par l'utilisateur. Cela permet une vérification croisée automatisée entre les documents financiers ou juridiques officiels et les déclarations manuelles.

---

## 📊 3. Mesures de Validation et Performance
L'évaluation empirique sur un ensemble de données de référence démontre la robustesse industrielle et l'exactitude statistique du moteur à travers toutes les couches primaires de classification et d'extraction :

| Axe d'Évaluation Principal | Ligne de Base Empirique |
| :--- | :--- |
| **Précision de Classification de Maturité** | $\ge 80\%$ |
| **Précision de Récupération Vectorielle @3** | $\ge 70\%$ |
| **Précision d'Extraction Multimodale** | $\ge 75\%$ |

La suite de validation a été testée par rapport à un ensemble de tests rigoureux comprenant 30 profils complets (5 profils uniques labellisés par stade de maturité), 10 documents d'extraction multidimensionnelle et 7 cas documentés de forte divergence entre la perception et la réalité.

---

## 🍃 4. Le Référentiel Green Score PNUD
La durabilité est traitée comme un pilier architectural de premier ordre. Développé sur la base des outils de référence officiels du Programme des Nations Unies pour le Développement (PNUD), le moteur cartographie les opérations du projet à travers quatre axes environnementaux distincts :

1. Impact sur le Climat et la Qualité de l'Air
2. Cycle de Vie et Conservation de l'Eau
3. Préservation des Sols et de la Biodiversité
4. Consommation Durable des Ressources et Gestion des Déchets

Chaque profil de projet évalué génère une note d'impact granulaire de 1 à 5 par pilier, créant un score global brut directement aligné sur les **Objectifs de Développement Durable (ODD) 8, 9, 10 et 17**. Des scores faibles mettent automatiquement à jour la matrice RAG en aval pour prioriser les subventions d'optimisation technique et financière (telles que les stratégies de transition écologique).

---

## 🏆 5. Contributions Majeures (Open-Source)
Massar introduit trois contributions fondamentales pour l'écosystème de recherche et de développement en Tunisie :

* 📁 **Répertoire Structuré de l'Écosystème :** Le premier catalogue entièrement cartographié de plus de 41 programmes de soutien tunisiens avec des schémas programmatiques pour les critères d'éligibilité, les opérateurs et les allocations de financement structurel.
* 🧠 **Taxonomie des Divergences :** Un ensemble de données labellisées capturant 7 modèles de divergence opérationnelle entre perception et réalité afin d'entraîner de futurs modèles d'alignement.
* 🌱 **Dataset de Startups Vertes :** Une cartographie d'évaluation environnementale de référence validée selon des critères multilatéraux globaux adaptés aux micro-entreprises régionales.

---

## 🔮 6. Conclusion et Perspectives
Le moteur Sentinel Massar établit une infrastructure technologique sécurisée, transparente et évolutive pour l'écosystème entrepreneurial tunisien. En mettant en œuvre un pipeline de données agentique orienté événements, la plateforme élimine l'opacité des assistants conversationnels génériques pour fournir des plans d'action vérifiables et de haute fidélité. 

**Prochaines étapes :** Déploiement pilote à l'échelle nationale, extension du catalogue à plus de 100 ressources institutionnelles localisées, et intégration au sein du réseau plus large des startups de la région MENA.

---
*Document technique généré dans le cadre du Sommet National de l'AINS 2026 - Hackathon.*
