"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import { supabase } from "./supabase";
import { getBooking, getBookings, getCabin } from "./data-service";
import { redirect } from "next/navigation";

export async function signInAction() {
  await signIn("google", {
    redirectTo: "/account",
  });
}

export async function signOutAction() {
  await signOut({
    redirectTo: "/",
  });
}

export async function updateGuest(formData) {
  //first we check for authorisation
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  // validate user inputs
  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  const nationalIdRegex = /^[a-zA-Z0-9]{6,12}$/;
  if (!nationalIdRegex.test(nationalID)) {
    throw new Error("Please Provide a valid national ID");
  }

  const updateData = {
    nationality,
    countryFlag,
    nationalID,
  };

  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.guestId);

  if (error) {
    console.error(error);
    throw new Error("Guest could not be updated");
  }
  revalidatePath("/account/profile");
}

export async function deleteBooking(bookingId) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");
  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingsIds = guestBookings.map((book) => book.id);

  if (!guestBookingsIds.includes(bookingId)) {
    throw new Error("You are not allowed to delete this booking");
  }

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    console.error(error);
    throw new Error("Booking could not be deleted");
  }

  revalidatePath("/account/reservations");
}

export async function updateBooking(formData) {
  // authentification
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  //autherization
  const reservationId = formData.get("reservationId");
  const { guestId, cabinId } = await getBooking(reservationId);
  if (session.user.guestId !== guestId) {
    throw new Error("You are not allowed to delete this booking");
  }

  const { maxCapacity } = await getCabin(cabinId);

  // validation
  const numGuests = Number(formData.get("numGuests"));

  if (numGuests > maxCapacity) {
    throw new Error(
      "number of guest is more than the max capacity of the cabin"
    );
  }

  const observations = formData.get("observations");
  if (observations.length > 100) {
    throw new Error("observation is too long");
  }

  const { error } = await supabase
    .from("bookings")
    .update({ numGuests, observations })
    .eq("id", reservationId)
    .select()
    .single();

  if (error) {
    console.error(error);
    throw new Error("Booking could not be updated");
  }

  revalidatePath("/account/reservations");
  revalidatePath(`/account/reservations/edit/${reservationId}`);

  redirect("/account/reservations");
}

export async function createBooking(bookingData, formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  const newBooking = {
    ...bookingData,
    guestId: session.user.guestId,
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    isPaid: false,
    hasBreakfast: false,
    status: "unconfirmed",
  };

  const { error } = await supabase.from("bookings").insert([newBooking]);
  if (error) {
    console.error(error);
    throw new Error("Booking could not be created");
  }

  revalidatePath(`/cabins/${bookingData.cabinId}`);
  redirect("/cabins/thankyou");
}
