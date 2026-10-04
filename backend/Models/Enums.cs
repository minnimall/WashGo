namespace WashGOApi.Models;

public enum LaundrySize { S, M, L }

public enum DetergentSource { Standard, CustomerOwn, Special }

public enum CatalogItemType { Item, AddOn }

public enum OrderImageType { PickupLaundry, Detergent, SizeAdjust, WashReceipt, Delivery }

public enum RiderVerificationStatus
{
    Registered, PendingReview, Approved, Rejected, Suspended
}

public enum OrderStatus
{
    Pending, Accepted, GoingToPickup, PickedUp, AwaitingPriceConfirmation,
    Washing, WashingCompleted, Delivering, Delivered, Completed, Cancelled
}