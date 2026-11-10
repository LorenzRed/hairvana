# Firebase setup

The web app and Capacitor Android app use the same Firebase project. Firebase web configuration is public client configuration; Firestore security rules protect account roles, listings, and orders.

## Connect a Firebase project

1. Create a Firebase project and register a **Web app**.
2. In **Authentication > Sign-in method**, enable **Email/Password**.
3. Create a **Cloud Firestore** database and enable **Cloud Storage** for product photos.
4. Copy `.env.example` to `.env.local` and fill in the web app values from **Project settings > Your apps**.
5. From this project folder, deploy Firestore rules and indexes:

   ```sh
   firebase login
   firebase use --add
   firebase deploy --only firestore,storage
   ```

   If staff receives **“Missing or insufficient permissions”** while loading or updating customer orders, publish the current Firestore rules:

   ```sh
   firebase deploy --only firestore:rules --project mobile-ab844
   ```

   Then sign out and back in with an active staff account. The rules only allow staff to view pending orders and orders assigned to their account, and to update deliveries they claimed.

   If the Firebase CLI is not installed, install it with `npm install --global firebase-tools`.

6. Add your website domain to **Authentication > Settings > Authorized domains**.

Restart `npm run dev` after changing `.env.local`. Make sure `VITE_FIREBASE_STORAGE_BUCKET` matches the bucket shown in Firebase project settings. Firebase configuration is included in the production bundle at build time.

## Create the first admin

1. Start the app and create an account using **Create customer account**.
2. In Firebase Console, open **Authentication > Users** and copy that account's UID.
3. In **Firestore Database > profiles**, open the document whose ID is that UID.
4. Change its `role` field from `customer` to `admin`.
5. Sign out and sign in again. The Admin workspace will now be available.

Only use the Firebase Console for the initial admin bootstrap. The app does not let customers change their own roles.

## Seller applications and staff delivery

Customers can apply to sell from the storefront. An admin reviews each application in the Admin workspace. Approved sellers get a seller dashboard to publish, edit, and remove their own listings and see orders on their products. Seller accounts can also buy items.

Staff accounts remain a separate admin-invited role for handling delivery. An admin creates an invitation for a staff email address. Give that invitation email to the staff member; they choose **Accept staff invite** and register using the same address. This starter stores invitations in Firestore but does not send invitation emails automatically.

Sellers and staff can publish listings with an uploaded JPG, PNG, or WebP photo (up to 5 MB) or a direct image URL, including category, condition, size, brand, color, and price. Customers create accounts, manage contact and delivery details, search/filter products, save a device-local wishlist and shopping bag, and check out up to 10 unique items. Checkout validates the customer's name, phone, and delivery address, requires an explicit Cash on delivery selection, and lets the customer review before placing the order. Each one-off item becomes its own order so staff can claim and deliver it individually. Customers can track order status live and cancel an order until staff claims it. Sellers see orders on their listings; staff can claim any pending order and mark delivery complete. Delivery addresses and phone numbers are visible to admins, sellers for their own orders, and the staff member handling the delivery.

## Build and host

- Web: run `npm run build`, then host the `dist/` folder on any static host. Configure the host to send unknown routes to `index.html`.
- Android: install Android Studio with its SDK and a compatible Java JDK, then run `npm run android:apk`. The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

Product images are currently supplied as image URLs, so choose URLs that are publicly accessible over HTTPS.
