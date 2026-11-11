// @ts-check
/**
 * JSDoc types of every collection in the mock database (money = integer paise, dates = "YYYY-MM-DD", date-times = ISO strings).
 * Generated from js/domain/schemas.js – when a schema changes, regenerate this file (a test fails if a collection has no type here).
 * Types are only for the editor; the runtime rules live in schemas.js / validators.js.
 */

/** Business date of the hotel, "YYYY-MM-DD". @typedef {string} BusinessDate */

/**
 * Collection `property`.
 * @typedef {Object} Property
 * @property {string} id
 * @property {string} name
 * @property {string} shortName
 * @property {string} address
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [pin]
 * @property {string} [country]
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [website]
 * @property {string} gstin
 * @property {string} [pan]
 * @property {string} [gstStateCode]
 * @property {number} rooms
 * @property {string} [checkInTime]
 * @property {string} [checkOutTime]
 * @property {string} [auditTime]
 * @property {number} [financialYearStartMonth]
 * @property {string} [timezone]
 * @property {string} [currency]
 * @property {string} [centralCode]
 * @property {boolean} [clubEnabled]
 */

/**
 * Collection `blocks`.
 * @typedef {Object} Block
 * @property {string} id
 * @property {string} code
 * @property {string} name
 */

/**
 * Collection `floors`.
 * @typedef {Object} Floor
 * @property {string} id
 * @property {number} number
 * @property {string} name
 * @property {string} [blockId]
 */

/**
 * Collection `roomFeatures`.
 * @typedef {Object} RoomFeature
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"view" | "bed" | "comfort" | "access"} category
 */

/**
 * Collection `roomTypes`.
 * @typedef {Object} RoomType
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {number} baseOccupancy
 * @property {number} maxAdults
 * @property {number} maxChildren
 * @property {number} maxOccupancy
 * @property {boolean} extraBedAllowed
 * @property {Array<string>} [bedOptions]
 * @property {Array<string>} [amenities]
 * @property {Array<string>} [photos]
 * @property {number} [sortOrder]
 * @property {boolean} [active]
 */

/**
 * Collection `rooms`.
 * @typedef {Object} Room
 * @property {string} id
 * @property {string} number
 * @property {number} floor
 * @property {string} roomTypeId
 * @property {"garden" | "pool" | "city" | "backwater"} view
 * @property {"king" | "twin"} bed
 * @property {Array<string>} [featureIds]
 * @property {string} [connectingRoomId]
 * @property {string} [lockId]
 * @property {"ready" | "dirty" | "occupied" | "out-of-order"} status
 * @property {boolean} [active]
 */

/**
 * Collection `outOfOrderPeriods`.
 * @typedef {Object} OutOfOrderPeriod
 * @property {string} id
 * @property {string} roomId
 * @property {string} from
 * @property {string} to
 * @property {string} [reasonId]
 * @property {string} [notes]
 * @property {string} [createdBy]
 */

/**
 * Collection `mealPlans`.
 * @typedef {Object} MealPlan
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {number} breakfast
 * @property {number} lunch
 * @property {number} dinner
 * @property {boolean} [includesBreakfast]
 * @property {boolean} [includesLunch]
 * @property {boolean} [includesDinner]
 * @property {boolean} [active]
 */

/**
 * Collection `taxSlabs`.
 * @typedef {Object} TaxSlab
 * @property {string} id
 * @property {string} name
 * @property {number} minRate
 * @property {number} [maxRate]
 * @property {number} ratePct
 * @property {number} cgstPct
 * @property {number} sgstPct
 * @property {number} igstPct
 * @property {string} effectiveFrom
 * @property {string} [effectiveTo]
 * @property {boolean} [active]
 */

/**
 * Collection `ratePlans`.
 * @typedef {Object} RatePlan
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"bar" | "member" | "advance" | "corporate" | "agent" | "package" | "group" | "complimentary"} type
 * @property {string} [description]
 * @property {string} mealPlanId
 * @property {boolean} isBase
 * @property {{ baseRatePlanId: string; mode: "none" | "percent" | "amount"; value: number }} [derivation]
 * @property {Array<string>} roomTypeIds
 * @property {number} [extraAdultCharge]
 * @property {number} [extraChildCharge]
 * @property {number} [extraBedCharge]
 * @property {Array<string>} [inclusions]
 * @property {string} cancellationPolicyId
 * @property {string} depositPolicyId
 * @property {Array<string>} [channelIds]
 * @property {{ minAdvanceDays?: number; maxAdvanceDays?: number }} [bookingWindow]
 * @property {string} [promoCode]
 * @property {"public" | "members" | "agents" | "corporate" | "hidden"} visibility
 * @property {number} [minStay]
 * @property {string} [sellFrom]
 * @property {string} [sellTo]
 * @property {string} [packageId]
 * @property {number} [sortOrder]
 * @property {boolean} [active]
 */

/**
 * Collection `rateCalendar`.
 * @typedef {Object} RateCalendarCell
 * @property {string} id
 * @property {string} roomTypeId
 * @property {string} ratePlanId
 * @property {string} date
 * @property {number} rate1
 * @property {number} rate2
 */

/**
 * Collection `seasons`.
 * @typedef {Object} Season
 * @property {string} id
 * @property {string} name
 * @property {"peak" | "regular" | "monsoon" | "shoulder"} kind
 * @property {string} from
 * @property {string} to
 * @property {number} adjustmentPct
 * @property {string} [notes]
 */

/**
 * Collection `specialDates`.
 * @typedef {Object} SpecialDate
 * @property {string} id
 * @property {string} name
 * @property {"festival" | "event" | "holiday"} kind
 * @property {string} from
 * @property {string} to
 * @property {number} [adjustmentPct]
 * @property {number} [minStay]
 * @property {boolean} [approximate]
 * @property {string} [notes]
 */

/**
 * Collection `restrictions`.
 * @typedef {Object} Restriction
 * @property {string} id
 * @property {string} [roomTypeId]
 * @property {string} [ratePlanId]
 * @property {string} from
 * @property {string} to
 * @property {Array<number>} [daysOfWeek]
 * @property {number} [minStay]
 * @property {number} [maxStay]
 * @property {boolean} closedToArrival
 * @property {boolean} closedToDeparture
 * @property {boolean} stopSell
 * @property {string} [reason]
 * @property {string} [createdBy]
 */

/**
 * Collection `overbookingLimits`.
 * @typedef {Object} OverbookingLimit
 * @property {string} id
 * @property {string} roomTypeId
 * @property {string} from
 * @property {string} to
 * @property {"overbooking" | "allotment" | "hold"} kind
 * @property {number} rooms
 * @property {string} [channelId]
 * @property {string} [notes]
 */

/**
 * Collection `cancellationPolicies`.
 * @typedef {Object} CancellationPolicy
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {Array<{ minHoursBefore: number; penaltyType: "none" | "nights" | "percent" | "amount"; penaltyValue: number }>} rules
 * @property {{ type: "none" | "nights" | "percent" | "amount"; value: number }} noShowPenalty
 * @property {boolean} nonRefundable
 * @property {string} guestText
 * @property {boolean} [active]
 */

/**
 * Collection `depositPolicies`.
 * @typedef {Object} DepositPolicy
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"none" | "nights" | "percent" | "amount"} kind
 * @property {number} value
 * @property {"on-booking" | "days-after-booking" | "days-before-arrival" | "option-date"} dueRule
 * @property {number} [dueDays]
 * @property {"alert" | "release" | "cancel"} ifUnpaid
 * @property {Array<"none" | "card" | "advance" | "company" | "agent">} acceptedGuarantees
 * @property {string} [guestText]
 * @property {boolean} [active]
 */

/**
 * Collection `reservationParameters`.
 * @typedef {Object} ReservationParameters
 * @property {string} id
 * @property {string} checkInTime
 * @property {string} checkOutTime
 * @property {number} minGuestAge
 * @property {number} childFreeMaxAge
 * @property {number} childFreeMaxCount
 * @property {number} extraBedCharge
 * @property {number} maxExtraBedsPerRoom
 * @property {number} defaultOptionDays
 * @property {number} maxAdvanceBookingDays
 * @property {number} maxStayNights
 * @property {number} maxRoomsPerBooking
 * @property {boolean} petsAllowed
 * @property {number} sessionTimeoutMinutes
 * @property {string} [defaultSourceId]
 * @property {string} [defaultSegmentId]
 * @property {string} gstStateCode
 * @property {string} currency
 * @property {string} auditTime
 * @property {Array<number>} [weekendDays]
 * @property {number} [weekendUpliftPct]
 */

/**
 * Collection `sources`.
 * @typedef {Object} Source
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"direct" | "brand" | "ota" | "agent" | "corporate" | "walk-in"} type
 * @property {string} [channelId]
 * @property {boolean} [active]
 */

/**
 * Collection `segments`.
 * @typedef {Object} Segment
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {boolean} [active]
 */

/**
 * Collection `channels`.
 * @typedef {Object} Channel
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"brand" | "website" | "ota"} type
 * @property {number} commissionPct
 * @property {string} [protocol]
 * @property {string} [contactEmail]
 * @property {string} [lastSyncAt]
 * @property {boolean} [active]
 */

/**
 * Collection `channelMappings`.
 * @typedef {Object} ChannelMapping
 * @property {string} id
 * @property {string} channelId
 * @property {string} externalRoomCode
 * @property {string} [externalRoomName]
 * @property {string} externalRateCode
 * @property {string} roomTypeId
 * @property {string} ratePlanId
 * @property {boolean} [active]
 */

/**
 * Collection `outlets`.
 * @typedef {Object} Outlet
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"restaurant" | "bar" | "spa" | "hall" | "room-service"} type
 * @property {number} [seasonFromMonth]
 * @property {number} [seasonToMonth]
 * @property {number} [capacity]
 * @property {boolean} [active]
 */

/**
 * Collection `addOns`.
 * @typedef {Object} AddOn
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {number} price
 * @property {"per-night" | "per-person" | "per-person-per-night" | "per-stay" | "per-item"} unit
 * @property {number} taxPct
 * @property {"front-office" | "housekeeping" | "f&b" | "transport" | "spa" | "engineering" | "concierge" | "sales"} department
 * @property {string} [outletId]
 * @property {"daily" | "on-checkin" | "on-date" | "on-checkout"} postingRule
 * @property {number} [maxQuantity]
 * @property {boolean} [active]
 */

/**
 * Collection `packages`.
 * @typedef {Object} Package
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {Array<string>} roomTypeIds
 * @property {Array<{ addOnId: string; quantity: number }>} [items]
 * @property {number} minNights
 * @property {string} [validFrom]
 * @property {string} [validTo]
 * @property {boolean} [active]
 */

/**
 * Collection `vipLevels`.
 * @typedef {Object} VipLevel
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {boolean} [active]
 */

/**
 * Collection `preferenceCodes`.
 * @typedef {Object} PreferenceCode
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"room" | "food" | "service" | "family"} category
 * @property {boolean} [active]
 */

/**
 * Collection `titles`.
 * @typedef {Object} Title
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {boolean} [active]
 */

/**
 * Collection `countries`.
 * @typedef {Object} Country
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} dialCode
 * @property {boolean} [active]
 */

/**
 * Collection `states`.
 * @typedef {Object} State
 * @property {string} id
 * @property {string} countryCode
 * @property {string} code
 * @property {string} name
 * @property {string} [gstStateCode]
 * @property {boolean} [active]
 */

/**
 * Collection `specialRequestCodes`.
 * @typedef {Object} SpecialRequestCode
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"front-office" | "housekeeping" | "f&b" | "transport" | "spa" | "engineering" | "concierge" | "sales"} department
 * @property {boolean} notify
 * @property {boolean} [active]
 */

/**
 * Collection `reasonCodes`.
 * @typedef {Object} ReasonCode
 * @property {string} id
 * @property {"cancellation" | "discount" | "rate-change" | "upgrade" | "lost-enquiry" | "refund" | "waiver" | "no-show" | "overbooking" | "blacklist" | "out-of-order"} type
 * @property {string} code
 * @property {string} name
 * @property {boolean} remarksRequired
 * @property {boolean} [active]
 */

/**
 * Collection `messageTemplates`.
 * @typedef {Object} MessageTemplate
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"quote" | "confirmation" | "tentative" | "amendment" | "cancellation" | "receipt" | "payment-link" | "advance-reminder" | "pre-arrival" | "waitlist" | "option-expiry" | "group-confirmation"} kind
 * @property {"whatsapp" | "email" | "sms"} channel
 * @property {string} language
 * @property {string} [subject]
 * @property {string} body
 * @property {boolean} [active]
 */

/**
 * Collection `numberSeries`.
 * @typedef {Object} NumberSeries
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} prefix
 * @property {"none" | "calendar" | "financial"} includeYear
 * @property {number} padding
 * @property {number} next
 * @property {"never" | "calendar-year" | "financial-year"} resetPolicy
 * @property {string} [lastResetOn]
 * @property {boolean} [active]
 */

/**
 * Collection `paymentModes`.
 * @typedef {Object} PaymentMode
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"cash" | "card" | "upi" | "link" | "bank" | "cheque" | "credit" | "prepaid" | "voucher"} type
 * @property {Array<string>} [cardTypes]
 * @property {boolean} requiresReference
 * @property {boolean} allowsRefund
 * @property {boolean} [active]
 */

/**
 * Collection `currencies`.
 * @typedef {Object} Currency
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} symbol
 * @property {number} decimals
 * @property {boolean} isBase
 * @property {boolean} [active]
 */

/**
 * Collection `exchangeRates`.
 * @typedef {Object} ExchangeRate
 * @property {string} id
 * @property {string} currencyCode
 * @property {string} date
 * @property {number} ratePaise
 * @property {string} [source]
 */

/**
 * Collection `pricingRules`.
 * @typedef {Object} PricingRule
 * @property {string} id
 * @property {string} name
 * @property {"occupancy"} metric
 * @property {"above" | "below"} operator
 * @property {number} threshold
 * @property {number} windowDays
 * @property {"percent" | "amount"} adjustmentType
 * @property {number} adjustmentValue
 * @property {number} [floor]
 * @property {number} [ceiling]
 * @property {Array<string>} [roomTypeIds]
 * @property {"suggest" | "apply"} mode
 * @property {boolean} enabled
 */

/**
 * Collection `roles`.
 * @typedef {Object} Role
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {Array<string>} permissions
 * @property {boolean} [isSystem]
 */

/**
 * Collection `permissions`.
 * @typedef {Object} Permission
 * @property {string} id
 * @property {string} [screen]
 * @property {string} action
 * @property {string} description
 */

/**
 * Collection `users`.
 * @typedef {Object} User
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} [phone]
 * @property {string} roleId
 * @property {Array<string>} propertyIds
 * @property {"otp" | "pin"} mfaMethod
 * @property {boolean} locked
 * @property {string} [lastLoginAt]
 * @property {string} createdAt
 * @property {boolean} [active]
 */

/**
 * Collection `approvalLimits`.
 * @typedef {Object} ApprovalLimit
 * @property {string} id
 * @property {string} roleId
 * @property {"discount-percent" | "rate-override-percent" | "refund-amount" | "penalty-waiver-amount" | "overbooking-rooms" | "complimentary-nights" | "void-payment"} action
 * @property {number} limit
 * @property {"percent" | "paise" | "rooms" | "nights" | "count"} unit
 * @property {number} escalateAfterMinutes
 * @property {string} [nextApproverRoleId]
 */

/**
 * Collection `guests`.
 * @typedef {Object} GuestProfile
 * @property {string} id
 * @property {string} [title]
 * @property {string} firstName
 * @property {string} lastName
 * @property {"female" | "male" | "other"} [gender]
 * @property {string} [dateOfBirth]
 * @property {string} [nationality]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {{ line1?: string; city?: string; state?: string; pin?: string; country?: string }} [address]
 * @property {string} [vipLevelId]
 * @property {string} [clubNumber]
 * @property {"member" | "silver" | "gold" | "platinum" | "diamond" | "signature"} [clubTier]
 * @property {Array<string>} [preferenceIds]
 * @property {string} [gstin]
 * @property {string} [companyName]
 * @property {string} [accountId]
 * @property {boolean} blacklisted
 * @property {string} [blacklistReason]
 * @property {{ marketing?: boolean; whatsapp?: boolean; email?: boolean; sms?: boolean; dataProcessing?: boolean }} [consent]
 * @property {number} stays
 * @property {number} nights
 * @property {string} [lastStay]
 * @property {string} [notes]
 * @property {string} createdAt
 */

/**
 * Collection `accounts`.
 * @typedef {Object} Account
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {"company" | "travel-agent" | "government" | "airline"} type
 * @property {string} [gstin]
 * @property {string} [pan]
 * @property {string} [stateCode]
 * @property {{ line1?: string; city?: string; state?: string; pin?: string; country?: string }} [address]
 * @property {Array<{ name: string; role?: string; email?: string; phone?: string }>} [contacts]
 * @property {number} creditLimit
 * @property {number} creditDays
 * @property {number} [commissionPct]
 * @property {"active" | "on-hold" | "blacklisted"} status
 * @property {string} [ratePlanId]
 * @property {string} createdAt
 * @property {string} [notes]
 */

/**
 * Collection `contracts`.
 * @typedef {Object} Contract
 * @property {string} id
 * @property {string} accountId
 * @property {string} [roomTypeId]
 * @property {string} ratePlanId
 * @property {number} [discountPct]
 * @property {number} [fixedRate]
 * @property {string} validFrom
 * @property {string} validTo
 * @property {string} [notes]
 */

/**
 * Collection `enquiries`.
 * @typedef {Object} Enquiry
 * @property {string} id
 * @property {string} number
 * @property {string} guestName
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [guestId]
 * @property {string} sourceId
 * @property {string} from
 * @property {string} to
 * @property {number} adults
 * @property {number} children
 * @property {number} rooms
 * @property {string} [roomTypeId]
 * @property {string} [ratePlanId]
 * @property {number} [quotedAmount]
 * @property {"open" | "quoted" | "converted" | "lost"} status
 * @property {string} [followUpOn]
 * @property {string} assignedTo
 * @property {string} [lostReasonId]
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {string} [reservationId]
 */

/**
 * Collection `reservations`.
 * @typedef {Object} Reservation
 * @property {string} id
 * @property {string} number
 * @property {"tentative" | "confirmed" | "guaranteed" | "checked-in" | "checked-out" | "cancelled" | "no-show"} status
 * @property {"none" | "card" | "advance" | "company" | "agent"} guaranteeType
 * @property {string} sourceId
 * @property {string} segmentId
 * @property {string} [channelId]
 * @property {string} [externalRef]
 * @property {string} [accountId]
 * @property {"guest" | "company" | "agent"} billTo
 * @property {string} [bookerGuestId]
 * @property {string} guestId
 * @property {string} arrival
 * @property {string} departure
 * @property {number} nights
 * @property {number} roomCount
 * @property {number} adults
 * @property {number} children
 * @property {string} ratePlanId
 * @property {string} mealPlanId
 * @property {number} subtotal
 * @property {number} taxTotal
 * @property {number} total
 * @property {number} paid
 * @property {number} balance
 * @property {string} [optionDate]
 * @property {string} [groupId]
 * @property {string} [enquiryId]
 * @property {boolean} vip
 * @property {boolean} locked
 * @property {string} [notes]
 * @property {Array<string>} [specialRequestIds]
 * @property {Array<string>} [preferenceIds]
 * @property {string} createdAt
 * @property {string} createdBy
 * @property {string} updatedAt
 * @property {string} [cancelledAt]
 * @property {string} [cancellationId]
 */

/**
 * Collection `reservationRooms`.
 * @typedef {Object} ReservationRoom
 * @property {string} id
 * @property {string} reservationId
 * @property {number} lineNo
 * @property {string} roomTypeId
 * @property {string} [roomId]
 * @property {number} adults
 * @property {number} children
 * @property {Array<number>} [childAges]
 * @property {string} ratePlanId
 * @property {string} mealPlanId
 * @property {boolean} extraBed
 * @property {number} [discountPct]
 * @property {string} [discountReasonId]
 */

/**
 * Collection `reservationNights`.
 * @typedef {Object} ReservationNight
 * @property {string} id
 * @property {string} reservationId
 * @property {string} roomLineId
 * @property {string} date
 * @property {string} roomTypeId
 * @property {number} baseRate
 * @property {number} extras
 * @property {number} discount
 * @property {number} net
 * @property {number} taxPct
 * @property {number} tax
 * @property {number} total
 * @property {boolean} overridden
 */

/**
 * Collection `sharers`.
 * @typedef {Object} Sharer
 * @property {string} id
 * @property {string} reservationId
 * @property {string} roomLineId
 * @property {string} [guestId]
 * @property {string} name
 * @property {number} [age]
 * @property {string} [relation]
 */

/**
 * Collection `billingInstructions`.
 * @typedef {Object} BillingInstruction
 * @property {string} id
 * @property {string} reservationId
 * @property {number} window
 * @property {"guest" | "company" | "agent"} payerType
 * @property {string} [accountId]
 * @property {Array<"room" | "tax" | "food" | "extras" | "all">} charges
 * @property {string} [notes]
 */

/**
 * Collection `reservationAddOns`.
 * @typedef {Object} ReservationAddOn
 * @property {string} id
 * @property {string} reservationId
 * @property {string} [roomLineId]
 * @property {string} addOnId
 * @property {string} date
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} total
 * @property {number} taxPct
 * @property {"planned" | "posted"} status
 */

/**
 * Collection `specialRequests`.
 * @typedef {Object} SpecialRequest
 * @property {string} id
 * @property {string} reservationId
 * @property {string} codeId
 * @property {"front-office" | "housekeeping" | "f&b" | "transport" | "spa" | "engineering" | "concierge" | "sales"} department
 * @property {string} [notes]
 * @property {"open" | "done"} status
 */

/**
 * Collection `notes`.
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} [reservationId]
 * @property {string} [guestId]
 * @property {"guest" | "internal"} kind
 * @property {string} text
 * @property {string} createdBy
 * @property {string} createdAt
 */

/**
 * Collection `attachments`.
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} reservationId
 * @property {string} name
 * @property {string} type
 * @property {number} sizeKb
 * @property {string} uploadedBy
 * @property {string} at
 */

/**
 * Collection `payments`.
 * @typedef {Object} Payment
 * @property {string} id
 * @property {string} [receiptNo]
 * @property {string} [reservationId]
 * @property {string} [groupId]
 * @property {"advance" | "deposit" | "balance"} kind
 * @property {number} amount
 * @property {string} modeId
 * @property {"received" | "pending" | "voided" | "failed"} status
 * @property {string} [reference]
 * @property {string} receivedAt
 * @property {string} receivedBy
 * @property {string} [currencyCode]
 * @property {string} [notes]
 */

/**
 * Collection `paymentLinks`.
 * @typedef {Object} PaymentLink
 * @property {string} id
 * @property {string} reservationId
 * @property {number} amount
 * @property {"sent" | "paid" | "expired" | "cancelled"} status
 * @property {string} url
 * @property {string} sentTo
 * @property {"whatsapp" | "email" | "sms"} channel
 * @property {string} createdAt
 * @property {string} expiresAt
 */

/**
 * Collection `refunds`.
 * @typedef {Object} Refund
 * @property {string} id
 * @property {string} reservationId
 * @property {string} [paymentId]
 * @property {number} amount
 * @property {string} modeId
 * @property {"pending-approval" | "approved" | "paid" | "rejected"} status
 * @property {string} reasonId
 * @property {string} [approvalId]
 * @property {string} at
 */

/**
 * Collection `cancellations`.
 * @typedef {Object} Cancellation
 * @property {string} id
 * @property {string} reservationId
 * @property {string} at
 * @property {string} byUserId
 * @property {string} reasonId
 * @property {string} policyId
 * @property {number} penalty
 * @property {number} refundDue
 * @property {boolean} waived
 * @property {string} [notes]
 */

/**
 * Collection `groups`.
 * @typedef {Object} Group
 * @property {string} id
 * @property {string} name
 * @property {"wedding" | "conference" | "tour" | "corporate"} type
 * @property {string} [accountId]
 * @property {string} contactName
 * @property {string} [contactPhone]
 * @property {string} [contactEmail]
 * @property {string} from
 * @property {string} to
 * @property {"tentative" | "definite" | "cancelled"} status
 * @property {string} cutOffDate
 * @property {string} ratePlanId
 * @property {Array<string>} [hallIds]
 * @property {string} salesPersonId
 * @property {string} [notes]
 * @property {string} createdAt
 */

/**
 * Collection `groupBlocks`.
 * @typedef {Object} GroupBlock
 * @property {string} id
 * @property {string} groupId
 * @property {string} roomTypeId
 * @property {string} date
 * @property {number} rooms
 * @property {number} released
 */

/**
 * Collection `waitlist`.
 * @typedef {Object} Waitlist
 * @property {string} id
 * @property {string} guestName
 * @property {string} [phone]
 * @property {string} [email]
 * @property {string} [guestId]
 * @property {string} roomTypeId
 * @property {string} from
 * @property {string} to
 * @property {number} rooms
 * @property {number} adults
 * @property {"waiting" | "notified" | "converted" | "expired" | "removed"} status
 * @property {string} createdAt
 * @property {string} [notes]
 */

/**
 * Collection `approvalRequests`.
 * @typedef {Object} ApprovalRequest
 * @property {string} id
 * @property {"discount" | "rate-override" | "refund" | "penalty-waiver" | "overbooking" | "complimentary" | "void-payment"} type
 * @property {string} [reservationId]
 * @property {string} requestedBy
 * @property {string} requestedAt
 * @property {string} roleNeededId
 * @property {number} [amount]
 * @property {"percent" | "paise" | "rooms" | "nights" | "count"} [unit]
 * @property {string} [reasonId]
 * @property {string} [reasonNote]
 * @property {"pending" | "approved" | "rejected" | "escalated"} status
 * @property {string} [decidedBy]
 * @property {string} [decidedAt]
 * @property {string} [decisionNote]
 * @property {string} [escalateAt]
 * @property {any} [payload]
 */

/**
 * Collection `messageLogs`.
 * @typedef {Object} MessageLog
 * @property {string} id
 * @property {string} [reservationId]
 * @property {string} [guestId]
 * @property {string} [enquiryId]
 * @property {string} templateId
 * @property {"whatsapp" | "email" | "sms"} channel
 * @property {string} to
 * @property {string} [subject]
 * @property {string} [preview]
 * @property {"queued" | "sent" | "delivered" | "read" | "failed"} status
 * @property {string} at
 */

/**
 * Collection `channelMessages`.
 * @typedef {Object} ChannelMessage
 * @property {string} id
 * @property {string} channelId
 * @property {"booking" | "modification" | "cancellation"} type
 * @property {string} externalRef
 * @property {string} receivedAt
 * @property {"queued" | "processed" | "failed"} status
 * @property {string} [reservationId]
 * @property {string} [error]
 * @property {{ guest?: string; from?: string; to?: string; roomCode?: string; rateCode?: string; amount?: number }} [summary]
 */

/**
 * Collection `channelSyncLogs`.
 * @typedef {Object} ChannelSyncLog
 * @property {string} id
 * @property {string} channelId
 * @property {"rates" | "availability" | "restrictions"} kind
 * @property {string} [from]
 * @property {string} [to]
 * @property {"success" | "partial" | "failed"} status
 * @property {number} records
 * @property {string} at
 * @property {string} [message]
 */

/**
 * Collection `inventoryDays`.
 * @typedef {Object} InventoryDay
 * @property {string} id
 * @property {string} roomTypeId
 * @property {string} date
 * @property {number} total
 * @property {number} outOfOrder
 * @property {number} sold
 * @property {number} groupUnpicked
 * @property {number} overbooking
 */

/**
 * Collection `auditLog`.
 * @typedef {Object} AuditLog
 * @property {string} id
 * @property {string} at
 * @property {string} userId
 * @property {string} entity
 * @property {string} entityId
 * @property {"create" | "update" | "delete" | "status" | "login"} action
 * @property {Array<{ field: string; old?: any; new?: any }>} [changes]
 * @property {string} [note]
 */

/**
 * Collection `notifications`.
 * @typedef {Object} Notification
 * @property {string} id
 * @property {"approval" | "alert" | "reminder"} kind
 * @property {string} title
 * @property {string} body
 * @property {string} at
 * @property {boolean} read
 * @property {string} [href]
 * @property {string} [refId]
 * @property {string} [roleId]
 * @property {string} [userId]
 */

/**
 * Collection `demo`.
 * @typedef {Object} DemoCounter
 * @property {string} id
 * @property {number} value
 */

export {};
