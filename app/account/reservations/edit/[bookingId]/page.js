import { getBooking, getCabin } from "@/app/_lib/data-service";
import UpdateBooking from "@/app/_components/UpdateBooking";

export default async function Page({ params }) {
  const reservationId = params.bookingId;
  const booking = await getBooking(params.bookingId);
  const { maxCapacity } = await getCabin(booking.cabinId);

  return (
    <div>
      <h2 className="font-semibold text-2xl text-accent-400 mb-7">
        Edit Reservation #{reservationId}
      </h2>
      <UpdateBooking maxCapacity={maxCapacity} booking={booking} />
    </div>
  );
}
