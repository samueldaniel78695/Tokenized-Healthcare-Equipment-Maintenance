;; Compliance Tracking Contract
;; Ensures adherence to regulatory standards

;; Compliance record structure
(define-map device-compliance
  { device-id: uint }
  {
    last-maintenance-date: (optional uint),
    next-required-date: uint,
    compliance-status: (string-ascii 20),
    certification-id: (optional (string-ascii 64)),
    certification-expiry: (optional uint)
  }
)

;; Initialize device compliance
(define-public (initialize-compliance (device-id uint) (next-required-date uint))
  (begin
    ;; Initialize compliance record
    (map-set device-compliance
      { device-id: device-id }
      {
        last-maintenance-date: none,
        next-required-date: next-required-date,
        compliance-status: "pending",
        certification-id: none,
        certification-expiry: none
      }
    )

    (ok true)
  )
)

;; Update device compliance after maintenance
(define-public (update-device-compliance (device-id uint))
  (let
    ((compliance (unwrap! (map-get? device-compliance { device-id: device-id }) (err u1)))
     (current-time (default-to u0 (get-block-info? time (- block-height u1)))))

    ;; Calculate next required maintenance (6 months from now)
    (let
      ((next-date (+ current-time (* u60 u60 u24 u30 u6))))

      ;; Update compliance record
      (map-set device-compliance
        { device-id: device-id }
        (merge compliance {
          last-maintenance-date: (some current-time),
          next-required-date: next-date,
          compliance-status: "compliant"
        })
      )

      (ok true)
    )
  )
)

;; Add certification to device
(define-public (add-certification
    (device-id uint)
    (certification-id (string-ascii 64))
    (certification-expiry uint))
  (let
    ((compliance (unwrap! (map-get? device-compliance { device-id: device-id }) (err u1))))

    ;; Update certification
    (map-set device-compliance
      { device-id: device-id }
      (merge compliance {
        certification-id: (some certification-id),
        certification-expiry: (some certification-expiry)
      })
    )

    (ok true)
  )
)

;; Check if device is compliant
(define-read-only (is-device-compliant (device-id uint))
  (let
    ((compliance (map-get? device-compliance { device-id: device-id }))
     (current-time (default-to u0 (get-block-info? time (- block-height u1)))))
    (if (is-some compliance)
      (let
        ((comp (unwrap-panic compliance)))
        (and
          (is-eq (get compliance-status comp) "compliant")
          (> (get next-required-date comp) current-time)
          (or
            (is-none (get certification-expiry comp))
            (> (default-to u0 (get certification-expiry comp)) current-time)
          )
        ))
      false
    )
  )
)

;; Get compliance details
(define-read-only (get-compliance-details (device-id uint))
  (map-get? device-compliance { device-id: device-id })
)

;; Check devices requiring maintenance
(define-read-only (needs-maintenance (device-id uint))
  (let
    ((compliance (map-get? device-compliance { device-id: device-id }))
     (current-time (default-to u0 (get-block-info? time (- block-height u1)))))
    (if (is-some compliance)
      (let
        ((comp (unwrap-panic compliance)))
        (< (get next-required-date comp) current-time)
      )
      false
    )
  )
)
