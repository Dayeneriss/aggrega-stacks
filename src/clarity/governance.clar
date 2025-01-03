;; governance.clar
(define-map admins principal bool)
(define-data-var owner principal tx-sender)

(define-public (add-admin
    (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) (err u1))
    (map-set admins new-admin true)
    (ok true)))

(define-public (remove-admin
    (admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) (err u1))
    (map-set admins admin false)
    (ok true)))