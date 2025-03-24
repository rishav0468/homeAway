'use client';
import useRentModal from "@/app/hooks/useRentModal";
import Modal from "./Modal";
import { useMemo, useState } from "react";
import Heading from "../Heading";
import { categories } from "../navbar/Categories";
import CategoryInput from "../inputs/CategoryInput";
import CountrySelect from "../inputs/CountrySelect";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import dynamic from "next/dynamic";
import Counter from "../inputs/Counter";
import ImageUpload from "../inputs/ImageUpload";
import Input from "../inputs/Input";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  BOOKING_TYPE = 3, // New step for booking type selection
  IMAGES = 4,
  DESCRIPTION = 5,
  PRICE = 6
}

const RentModal = () => {
  const router = useRouter();
  const rentModal = useRentModal();

  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);

  const {
      register,
      handleSubmit,
      setValue,
      watch,
      formState: {
          errors,
      }, reset
  } = useForm<FieldValues>({
      defaultValues: {
          category: '',
          location: null,
          guestCount: 1,
          roomCount: 1,
          bathroomCount: 1,
          imageSrc: '',
          price: 1,
          title: '',
          description: '',
          bookingType: 'daily', // Default booking type
          startTime: '',         // For hourly bookings
          endTime: ''            // For hourly bookings
      }
  });

  const category = watch('category');
  const location = watch('location');
  const guestCount = watch('guestCount');
  const roomCount = watch('roomCount');
  const bathroomCount = watch('bathroomCount');
  const imageSrc = watch('imageSrc');
  const bookingType = watch('bookingType');

  const Map = useMemo(() => dynamic(() => import("../Map"), { ssr: false }), [location]);

  const setCustomValue = (id: string, value: any) => {
      setValue(id, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
      })
  }

  const onBack = () => {
      setStep((value) => value - 1);
  };

  const onNext = () => {
      setStep((value) => value + 1);
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
      if (step != STEPS.PRICE) {
          return onNext();
      }

      setIsLoading(true);

      axios.post("/api/listings", data)
          .then(() => {
              toast.success("Listing Created!");
              router.refresh();
              reset();
              setStep(STEPS.CATEGORY);
              rentModal.onClose();
          })
          .catch(() => {
              toast.error("Something went wrong.");
          })
          .finally(() => {
              setIsLoading(false);
          });
  };

  const actionLabel = useMemo(() => {
      if (step === STEPS.PRICE) {
          return 'Create';
      }
      return 'Next';
  }, [step]);

  const secondaryActionLabel = useMemo(() => {
      if (step === STEPS.CATEGORY) {
          return undefined;
      }
      return 'Back';
  }, [step]);

  let bodycontent = (
      <div className="flex flex-col gap-8">
          <Heading
              title="Which of these best describes your place?"
              subtitle="Pick a category"
          />
          <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-3
                max-h-[50vh]
                overflow-y-auto">
              {categories.map((item) => (
                  <div key={item.label} className="col-span-1">
                      <CategoryInput
                          onClick={(category) => setCustomValue('category', category)}
                          selected={category === item.label}
                          label={item.label}
                          icon={item.icon}
                      />
                  </div>
              ))}
          </div>
      </div>
  )

  if (step === STEPS.LOCATION) {
      bodycontent = (
          <div className="flex flex-col gap-8">
              <Heading
                  title="Where is your place located?"
                  subtitle="Help guests find you!"
              />
              <CountrySelect
                  value={location}
                  onChange={(value) => setCustomValue('location', value)}
              />
              <Map
                  center={location?.latlng}
              />
          </div>
      )
  }

  if (step === STEPS.INFO) {
      bodycontent = (
          <div className="flex flex-col gap-8">
              <Heading
                  title="Share some basics about your place"
                  subtitle="What amenities do you have?"
              />
              <Counter
                  title="Guests"
                  subtitle="How many guests do you allow?"
                  value={guestCount}
                  onChange={(value) => setCustomValue('guestCount', value)}
              />
              <hr />
              <Counter
                  title="Rooms"
                  subtitle="How many rooms do you have?"
                  value={roomCount}
                  onChange={(value) => setCustomValue('roomCount', value)}
              />
              <hr />
              <Counter
                  title="Bathrooms"
                  subtitle="How many bathrooms do you have?"
                  value={bathroomCount}
                  onChange={(value) => setCustomValue('bathroomCount', value)}
              />
          </div>
      );
  }

  // New step for booking type selection
  if (step === STEPS.BOOKING_TYPE) {
      bodycontent = (
          <div className="flex flex-col gap-8">
              <Heading
                  title="How would you like to rent your place?"
                  subtitle="Choose a booking type"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div 
                      onClick={() => setCustomValue('bookingType', 'daily')}
                      className={`
                          rounded-xl
                          border-2
                          p-4
                          flex
                          flex-col
                          gap-3
                          hover:border-black
                          transition
                          cursor-pointer
                          ${bookingType === 'daily' ? 'border-black' : 'border-neutral-200'}
                      `}
                  >
                      <div className="font-semibold">Daily Rental</div>
                      <div className="font-light text-neutral-500">
                          Guests book your place by the day
                      </div>
                  </div>
                  
                  <div 
                      onClick={() => setCustomValue('bookingType', 'hourly')}
                      className={`
                          rounded-xl
                          border-2
                          p-4
                          flex
                          flex-col
                          gap-3
                          hover:border-black
                          transition
                          cursor-pointer
                          ${bookingType === 'hourly' ? 'border-black' : 'border-neutral-200'}
                      `}
                  >
                      <div className="font-semibold">Hourly Rental</div>
                      <div className="font-light text-neutral-500">
                          Guests book your place by the hour
                      </div>
                  </div>
              </div>
              
              {bookingType === 'hourly' && (
                  <div className="flex flex-col gap-4 mt-4">
                      <hr />
                      <Heading
                          title="Set your available hours"
                          subtitle="When can guests book your place?"
                          center={false}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Available from
                              </label>
                              <input
                                  type="time"
                                  id="startTime"
                                  className="w-full p-4 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed"
                                  {...register("startTime", { required: bookingType === 'hourly' })}
                              />
                              {errors.startTime && (
                                  <span className="text-red-500 text-sm">This field is required</span>
                              )}
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Available until
                              </label>
                              <input
                                  type="time"
                                  id="endTime"
                                  className="w-full p-4 font-light bg-white border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed"
                                  {...register("endTime", { required: bookingType === 'hourly' })}
                              />
                              {errors.endTime && (
                                  <span className="text-red-500 text-sm">This field is required</span>
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (step === STEPS.IMAGES) {
      bodycontent = (
          <div className="flex flex-col gap-8">
              <Heading
                  title="Add a photo of your place"
                  subtitle="Show guests what your place looks like!"
              />

              <ImageUpload
                  value={imageSrc}
                  onChange={(value) => setCustomValue("imageSrc", value)}
              />
          </div>
      );
  }

  if (step === STEPS.DESCRIPTION) {
      bodycontent = (
          <div className="flex flex-col gap-8">
              <Heading
                  title="How would you describe your place?"
                  subtitle="Short and sweet works best!"
              />
              <Input
                  id="title"
                  label="Title"
                  disabled={isLoading}
                  register={register}
                  errors={errors}
                  required
              />
              <hr />
              <Input
                  id="description"
                  label="Description"
                  disabled={isLoading}
                  register={register}
                  errors={errors}
                  required
              />
          </div>
      );
  }

  if (step === STEPS.PRICE) {
      bodycontent = (
          <div className="flex flex-col gap-8">
              <Heading
                  title="Now, set your price"
                  subtitle={bookingType === 'hourly' ? "How much do you charge per hour?" : "How much do you charge per night?"}
              />
              <Input
                  id="price"
                  label={bookingType === 'hourly' ? "Price per hour" : "Price per night"}
                  formatPrice={true}
                  type="number"
                  disabled={isLoading}
                  register={register}
                  errors={errors}
                  required
              />
          </div>
      );
  }

  return (
      <Modal
          isOpen={rentModal.isOpen}
          onClose={rentModal.onClose}
          onSubmit={handleSubmit(onSubmit)}
          actionLabel={actionLabel}
          secondaryActionLabel={secondaryActionLabel}
          secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
          title="Airbnb your home!"
          body={bodycontent} disabled={false} />
  );
}

export default RentModal;